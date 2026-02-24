import { createHttpError } from "../ambulance.common.js";

const TAB_TO_STATUS = {
  requested: "pending",
  in_progress: "assigned",
  completed: "completed",
  cancelled: "cancelled",
};

const TYPE_ALIAS = {
  nonpatient: "non_patient",
  "non-patient": "non_patient",
  non_patient: "non_patient",
};

const PRIORITY_ALIAS = {
  critical: "emergency",
  high: "urgent",
  normal: "normal",
  emergency: "emergency",
  urgent: "urgent",
};

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[\s-]+/g, "_");
}

function parseCsvList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => normalizeKey(item))
    .filter(Boolean);
}

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function formatPriority(priorityValue) {
  if (!priorityValue) return null;
  if (priorityValue === "emergency") return "critical";
  if (priorityValue === "urgent") return "high";
  return "normal";
}

function formatVehicleType(value) {
  const type = normalizeKey(value);
  if (type === "bls") return "Basic";
  if (type === "als") return "Advanced";
  if (type === "icu") return "AC";
  if (!type) return "Unknown";
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isBusyTripStatus(tripStatus) {
  return ["assigned", "started", "reached_pickup", "patient_onboard"].includes(
    String(tripStatus || ""),
  );
}

function parseDateTime(value, fieldName) {
  const dt = new Date(value);
  if (!value || Number.isNaN(dt.getTime())) {
    throw createHttpError(`Invalid ${fieldName}. Use ISO date-time.`, 400);
  }
  return dt;
}

function getDayRange(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function buildWhereClause(tenantId, query = {}) {
  const where = {
    tenant_id: BigInt(tenantId),
  };
  const andConditions = [];

  const search = normalizeText(query.search);
  if (search) {
    where.OR = [
      { call_number: { contains: search, mode: "insensitive" } },
      { patient_name: { contains: search, mode: "insensitive" } },
      { patient_uhid: { contains: search, mode: "insensitive" } },
      { pickup_location: { contains: search, mode: "insensitive" } },
      { drop_location: { contains: search, mode: "insensitive" } },
    ];
  }

  const tab = normalizeKey(query.tab);
  const mappedStatus = TAB_TO_STATUS[tab];
  const explicitStatus = normalizeKey(query.status);
  const status = explicitStatus || null;
  if (status && status !== "all") {
    andConditions.push({ status });
  } else if (mappedStatus && mappedStatus !== "all") {
    if (tab === "requested") {
      andConditions.push({
        OR: [
          { status: "pending" },
          { status: "assigned" },
          { status: null },
        ],
      });
      andConditions.push({
        OR: [
          { trips: { none: {} } },
          { trips: { some: { trip_status: "assigned" } } },
        ],
      });
    } else if (tab === "in_progress") {
      andConditions.push({
        trips: {
          some: {
            trip_status: {
              in: ["started", "reached_pickup", "patient_onboard"],
            },
          },
        },
      });
    } else if (tab === "completed") {
      andConditions.push({
        OR: [
          { status: "completed" },
          { trips: { some: { trip_status: "completed" } } },
        ],
      });
    } else if (tab === "cancelled") {
      andConditions.push({
        OR: [
          { status: "cancelled" },
          { trips: { some: { trip_status: "cancelled" } } },
        ],
      });
    } else {
      andConditions.push({ status: mappedStatus });
    }
  }

  const typeValues = parseCsvList(query.types || query.type).map(
    (item) => TYPE_ALIAS[item] || item,
  );
  if (typeValues.length) {
    const expandedTypeValues = [...new Set(
      typeValues.flatMap((value) => [
        value,
        value.replace(/_/g, "-"),
        value.replace(/-/g, "_"),
      ]),
    )];

    andConditions.push({
      OR: expandedTypeValues.map((value) => ({
        call_type: { equals: value, mode: "insensitive" },
      })),
    });
  }

  const priorityValues = parseCsvList(query.priorities || query.priority).map(
    (item) => PRIORITY_ALIAS[item] || item,
  );
  if (priorityValues.length) {
    andConditions.push({ priority: { in: priorityValues } });
  }

  const fromDate = query.from_date ? new Date(query.from_date) : null;
  const toDate = query.to_date ? new Date(query.to_date) : null;

  if (fromDate && Number.isNaN(fromDate.getTime())) {
    throw createHttpError("Invalid from_date. Use YYYY-MM-DD format.", 400);
  }
  if (toDate && Number.isNaN(toDate.getTime())) {
    throw createHttpError("Invalid to_date. Use YYYY-MM-DD format.", 400);
  }
  if (fromDate && toDate && fromDate > toDate) {
    throw createHttpError("from_date cannot be after to_date.", 400);
  }

  if (fromDate || toDate) {
    where.created_at = {};
    if (fromDate) {
      where.created_at.gte = new Date(
        Date.UTC(
          fromDate.getUTCFullYear(),
          fromDate.getUTCMonth(),
          fromDate.getUTCDate(),
          0,
          0,
          0,
          0,
        ),
      );
    }
    if (toDate) {
      where.created_at.lte = new Date(
        Date.UTC(
          toDate.getUTCFullYear(),
          toDate.getUTCMonth(),
          toDate.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
    }
  }

  if (andConditions.length) {
    where.AND = andConditions;
  }

  return where;
}

export async function getAvailableAmbulances(prisma, tenantId, query = {}) {
  if (!prisma?.ambulances) {
    throw createHttpError("Database client unavailable", 500);
  }

  const search = normalizeText(query.search);
  const facilityId = query.facility_id ? Number(query.facility_id) : null;

  const ambulances = await prisma.ambulances.findMany({
    where: {
      tenant_id: BigInt(tenantId),
      is_active: true,
      ...(Number.isInteger(facilityId) && facilityId > 0
        ? { facility_id: BigInt(facilityId) }
        : {}),
    },
    include: {
      status_logs: {
        select: {
          status: true,
          changed_at: true,
        },
        orderBy: {
          changed_at: "desc",
        },
        take: 1,
      },
      trips: {
        select: {
          trip_status: true,
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      vehicle_number: "asc",
    },
  });

  const data = ambulances
    .filter((amb) => {
      const latestStatus = amb.status_logs?.[0]?.status || "available";
      const latestTripStatus = amb.trips?.[0]?.trip_status || null;
      const availableByStatus = latestStatus === "available";
      const notBusy = !isBusyTripStatus(latestTripStatus);
      return availableByStatus && notBusy;
    })
    .map((amb) => {
      const typeLabel = formatVehicleType(amb.vehicle_type);
      const label = `${amb.vehicle_number} (${typeLabel})`;
      return {
        ambulance_id: Number(amb.ambulance_id),
        vehicle_number: amb.vehicle_number,
        vehicle_type: amb.vehicle_type,
        type_label: typeLabel,
        label,
      };
    })
    .filter((item) => {
      if (!search) return true;
      const hay = `${item.vehicle_number} ${item.type_label} ${item.label}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });

  return {
    total: data.length,
    data,
  };
}

export async function getAmbulanceDashboardCounts(prisma, tenantId) {
  if (!prisma?.ambulance_calls || !prisma?.ambulance_trips) {
    throw createHttpError("Database client unavailable", 500);
  }

  const { start, end } = getDayRange();
  const tenant = BigInt(tenantId);

  const [pendingAssignment, activeTrips, tripsCompletedToday, cancelledTrip] =
    await Promise.all([
      prisma.ambulance_calls.count({
        where: {
          tenant_id: tenant,
          status: "pending",
        },
      }),
      prisma.ambulance_trips.count({
        where: {
          tenant_id: tenant,
          trip_status: {
            in: ["assigned", "started", "reached_pickup", "patient_onboard"],
          },
        },
      }),
      prisma.ambulance_trips.count({
        where: {
          tenant_id: tenant,
          trip_status: "completed",
          end_time: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.ambulance_calls.count({
        where: {
          tenant_id: tenant,
          status: "cancelled",
          created_at: {
            gte: start,
            lte: end,
          },
        },
      }),
    ]);

  return {
    data: {
      pending_assignment: pendingAssignment,
      active_trips: activeTrips,
      trips_completed_today: tripsCompletedToday,
      cancelled_trip: cancelledTrip,
    },
    meta: {
      from: start.toISOString(),
      to: end.toISOString(),
    },
  };
}

export async function getAvailableDrivers(prisma, tenantId, query = {}) {
  if (!prisma?.ambulance_drivers) {
    throw createHttpError("Database client unavailable", 500);
  }

  const search = normalizeText(query.search).toLowerCase();

  const drivers = await prisma.ambulance_drivers.findMany({
    where: {
      tenant_id: BigInt(tenantId),
      is_active: true,
    },
    include: {
      trips: {
        select: {
          trip_status: true,
          created_at: true,
        },
        orderBy: {
          created_at: "desc",
        },
        take: 1,
      },
    },
    orderBy: {
      full_name: "asc",
    },
  });

  const data = drivers
    .filter((driver) => {
      const latestTripStatus = driver.trips?.[0]?.trip_status || null;
      return !isBusyTripStatus(latestTripStatus);
    })
    .map((driver) => ({
      driver_id: Number(driver.driver_id),
      full_name: driver.full_name,
    }))
    .filter((driver) => {
      if (!search) return true;
      return driver.full_name.toLowerCase().includes(search);
    });

  return {
    total: data.length,
    data,
  };
}

export async function cancelAmbulanceCall(prisma, tenantId, userId, payload = {}) {
  if (!prisma?.ambulance_calls || !prisma?.ambulance_trips) {
    throw createHttpError("Database client unavailable", 500);
  }

  const callId = Number(payload.call_id);
  const cancellationReason = normalizeText(payload.cancellation_reason);
  const additionalRemarks = normalizeText(payload.additional_remarks);

  if (!Number.isInteger(callId) || callId <= 0) {
    throw createHttpError("call_id is required and must be a positive integer.", 400);
  }
  if (!cancellationReason) {
    throw createHttpError("cancellation_reason is required.", 400);
  }

  const call = await prisma.ambulance_calls.findFirst({
    where: {
      call_id: BigInt(callId),
      tenant_id: BigInt(tenantId),
    },
    select: {
      call_id: true,
      call_number: true,
      status: true,
    },
  });

  if (!call) {
    throw createHttpError("Ambulance call not found for this tenant.", 404);
  }
  if (String(call.status || "") === "completed") {
    throw createHttpError("Completed call cannot be cancelled.", 400);
  }
  if (String(call.status || "") === "cancelled") {
    throw createHttpError("Call is already cancelled.", 400);
  }

  const activeTrip = await prisma.ambulance_trips.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      call_id: BigInt(callId),
      trip_status: { in: ["assigned", "started", "reached_pickup", "patient_onboard"] },
    },
    orderBy: {
      created_at: "desc",
    },
    select: {
      trip_id: true,
      ambulance_id: true,
      trip_status: true,
      notes: true,
    },
  });

  const remarksCombined = additionalRemarks
    ? `${cancellationReason} | ${additionalRemarks}`
    : cancellationReason;

  const result = await prisma.$transaction(async (tx) => {
    await tx.ambulance_calls.update({
      where: { call_id: BigInt(callId) },
      data: { status: "cancelled" },
    });

    let cancelledTrip = null;

    if (activeTrip) {
      const notes = activeTrip.notes
        ? `${activeTrip.notes}\n[Cancelled] ${remarksCombined}`
        : `[Cancelled] ${remarksCombined}`;

      cancelledTrip = await tx.ambulance_trips.update({
        where: { trip_id: activeTrip.trip_id },
        data: {
          trip_status: "cancelled",
          end_time: new Date(),
          notes,
        },
        select: {
          trip_id: true,
          trip_status: true,
          end_time: true,
        },
      });

      await tx.ambulance_status_logs.create({
        data: {
          tenant_id: BigInt(tenantId),
          ambulance_id: activeTrip.ambulance_id,
          status: "available",
          reason: `Call ${call.call_number} cancelled: ${remarksCombined}`,
          changed_by: userId ? BigInt(userId) : null,
        },
      });
    }

    return cancelledTrip;
  });

  return {
    call_id: callId,
    call_number: call.call_number,
    call_status: "cancelled",
    cancellation_reason: cancellationReason,
    additional_remarks: additionalRemarks || null,
    trip_id: result?.trip_id ? Number(result.trip_id) : null,
    trip_status: result?.trip_status || null,
    cancelled_at: result?.end_time ? result.end_time.toISOString() : new Date().toISOString(),
  };
}

export async function assignAmbulance(prisma, tenantId, userId, payload = {}) {
  if (!prisma?.ambulance_calls || !prisma?.ambulance_trips) {
    throw createHttpError("Database client unavailable", 500);
  }

  const callId = Number(payload.call_id);
  const ambulanceId = Number(payload.ambulance_id);
  const driverId = Number(payload.driver_id);
  const dispatchTime = parseDateTime(payload.dispatch_time, "dispatch_time");
  const estimatedArrivalTime = parseDateTime(
    payload.estimated_arrival_time,
    "estimated_arrival_time",
  );

  if (!Number.isInteger(callId) || callId <= 0) {
    throw createHttpError("call_id is required and must be a positive integer.", 400);
  }
  if (!Number.isInteger(ambulanceId) || ambulanceId <= 0) {
    throw createHttpError("ambulance_id is required and must be a positive integer.", 400);
  }
  if (!Number.isInteger(driverId) || driverId <= 0) {
    throw createHttpError("driver_id is required and must be a positive integer.", 400);
  }
  if (dispatchTime > estimatedArrivalTime) {
    throw createHttpError("dispatch_time cannot be after estimated_arrival_time.", 400);
  }

  const [call, ambulance, driver, busyAmbulanceTrip, busyDriverTrip] = await Promise.all([
    prisma.ambulance_calls.findFirst({
      where: { call_id: BigInt(callId), tenant_id: BigInt(tenantId) },
      select: { call_id: true, call_number: true, status: true, tenant_id: true },
    }),
    prisma.ambulances.findFirst({
      where: {
        ambulance_id: BigInt(ambulanceId),
        tenant_id: BigInt(tenantId),
        is_active: true,
      },
      select: { ambulance_id: true, vehicle_number: true },
    }),
    prisma.ambulance_drivers.findFirst({
      where: {
        driver_id: BigInt(driverId),
        tenant_id: BigInt(tenantId),
        is_active: true,
      },
      select: { driver_id: true, full_name: true },
    }),
    prisma.ambulance_trips.findFirst({
      where: {
        tenant_id: BigInt(tenantId),
        ambulance_id: BigInt(ambulanceId),
        trip_status: { in: ["assigned", "started", "reached_pickup", "patient_onboard"] },
      },
      orderBy: { created_at: "desc" },
      select: { trip_id: true, trip_status: true },
    }),
    prisma.ambulance_trips.findFirst({
      where: {
        tenant_id: BigInt(tenantId),
        driver_id: BigInt(driverId),
        trip_status: { in: ["assigned", "started", "reached_pickup", "patient_onboard"] },
      },
      orderBy: { created_at: "desc" },
      select: { trip_id: true, trip_status: true },
    }),
  ]);

  if (!call) {
    throw createHttpError("Ambulance call not found for this tenant.", 404);
  }
  if (["completed", "cancelled"].includes(String(call.status || ""))) {
    throw createHttpError(`Cannot assign for a ${call.status} call.`, 400);
  }
  if (!ambulance) {
    throw createHttpError("Selected ambulance not found or inactive.", 404);
  }
  if (!driver) {
    throw createHttpError("Selected driver not found or inactive.", 404);
  }
  if (busyAmbulanceTrip) {
    throw createHttpError("Selected ambulance is currently busy.", 409);
  }
  if (busyDriverTrip) {
    throw createHttpError("Selected driver is currently busy.", 409);
  }

  const existingTrip = await prisma.ambulance_trips.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      call_id: BigInt(callId),
      trip_status: { in: ["assigned", "started", "reached_pickup", "patient_onboard"] },
    },
    select: { trip_id: true },
  });

  if (existingTrip) {
    throw createHttpError("This ambulance call already has an active assignment.", 409);
  }

  const result = await prisma.$transaction(async (tx) => {
    const trip = await tx.ambulance_trips.create({
      data: {
        tenant_id: BigInt(tenantId),
        call_id: BigInt(callId),
        ambulance_id: BigInt(ambulanceId),
        driver_id: BigInt(driverId),
        start_time: dispatchTime,
        pickup_time: estimatedArrivalTime,
        trip_status: "assigned",
      },
      select: {
        trip_id: true,
        trip_status: true,
        start_time: true,
        pickup_time: true,
      },
    });

    await tx.ambulance_calls.update({
      where: { call_id: BigInt(callId) },
      data: { status: "assigned" },
    });

    await tx.ambulance_status_logs.create({
      data: {
        tenant_id: BigInt(tenantId),
        ambulance_id: BigInt(ambulanceId),
        status: "on_trip",
        reason: `Assigned to call ${call.call_number}`,
        changed_by: userId ? BigInt(userId) : null,
      },
    });

    return trip;
  });

  return {
    call_id: callId,
    call_number: call.call_number,
    ambulance_id: ambulanceId,
    ambulance_name: payload.ambulance_name || ambulance.vehicle_number,
    driver_id: driverId,
    driver_name: payload.driver_name || driver.full_name,
    dispatch_time: result.start_time ? result.start_time.toISOString() : null,
    estimated_arrival_time: result.pickup_time ? result.pickup_time.toISOString() : null,
    trip_id: Number(result.trip_id),
    trip_status: result.trip_status,
    call_status: "assigned",
  };
}

export async function listAmbulanceCalls(prisma, tenantId, query = {}) {
  if (!prisma?.ambulance_calls) {
    throw createHttpError("Database client unavailable", 500);
  }

  const page = toInt(query.page, 1);
  const pageSize = Math.min(toInt(query.pageSize, 10), 100);
  const skip = (page - 1) * pageSize;
  const selectedTab = normalizeKey(query.tab);
  const where = buildWhereClause(tenantId, query);
  const allTabs = [
    { key: "requested", label: "Requested Trips", status: "pending" },
    { key: "in_progress", label: "Trip in Progress", status: "assigned" },
    { key: "completed", label: "Completed Trips", status: "completed" },
    { key: "cancelled", label: "Cancelled Trips", status: "cancelled" },
  ];
  const tabs =
    selectedTab && selectedTab !== "all"
      ? allTabs.filter((tab) => tab.key === selectedTab)
      : allTabs;

  const [total, rows] = await Promise.all([
    prisma.ambulance_calls.count({ where }),
    prisma.ambulance_calls.findMany({
      where,
      include: {
        patients: {
          select: {
            patient_id: true,
            first_name: true,
            last_name: true,
            upid: true,
          },
        },
        trips: {
          select: {
            trip_id: true,
            trip_status: true,
            start_time: true,
            pickup_time: true,
            drop_time: true,
            end_time: true,
            created_at: true,
          },
          orderBy: {
            created_at: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: pageSize,
    }),
  ]);

  const data = rows.map((item) => {
    const latestTrip = item.trips?.[0] || null;
    const patientName =
      item.patient_name ||
      [item.patients?.first_name, item.patients?.last_name]
        .filter(Boolean)
        .join(" ") ||
      null;

    const callTime = item.created_at
      ? item.created_at.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

    return {
      call_id: Number(item.call_id),
      call_number: item.call_number,
      patient_id: item.patient_id ? Number(item.patient_id) : null,
      patient_name: patientName,
      patient_uhid: item.patient_uhid || item.patients?.upid || null,
      pickup_location: item.pickup_location,
      drop_location: item.drop_location,
      call_type: item.call_type,
      priority: formatPriority(item.priority),
      db_priority: item.priority || null,
      status: item.status || "pending",
      latest_trip_status: latestTrip?.trip_status || null,
      trip_id: latestTrip?.trip_id ? Number(latestTrip.trip_id) : null,
      requested_by: item.requested_by ? Number(item.requested_by) : null,
      created_at: item.created_at ? item.created_at.toISOString() : null,
      trip_details: {
        call_number: item.call_number,
        call_time: callTime,
      },
      patient_info: {
        name: patientName,
        upid: item.patient_uhid || item.patients?.upid || null,
      },
      route: {
        pickup: item.pickup_location,
        drop: item.drop_location,
      },
      type: item.call_type,
    };
  });

  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    data,
    tabs,
  };
}
