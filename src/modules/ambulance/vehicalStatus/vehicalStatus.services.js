import { createHttpError } from "../ambulance.common.js";

function toVehicleTypeLabel(value) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseDateOnly(value, fieldName) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} must be a valid YYYY-MM-DD`, 400);
  }
  return date;
}

function normalizeEnumFilter(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatStatusLabel(value) {
  return String(value || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function getVehicleTypeList(prisma, query = {}) {
  const search = normalizeText(query.search);

  if (!prisma?.$queryRaw) {
    throw createHttpError("Database client unavailable", 500);
  }

  const rows = await prisma.$queryRaw`
    SELECT unnest(enum_range(NULL::ambulance_type))::text AS vehicle_type;
  `;

  const allTypes = rows.map((row) => ({
    value: String(row.vehicle_type),
    label: toVehicleTypeLabel(String(row.vehicle_type)),
  }));

  const data = search
    ? allTypes.filter(
        (item) =>
          normalizeText(item.value).includes(search) ||
          normalizeText(item.label).includes(search),
      )
    : allTypes;

  return {
    total: data.length,
    data,
  };
}

export async function getStatusTypeList(prisma, query = {}) {
  const search = normalizeText(query.search);

  if (!prisma?.$queryRaw) {
    throw createHttpError("Database client unavailable", 500);
  }

  const rows = await prisma.$queryRaw`
    SELECT unnest(enum_range(NULL::ambulance_status))::text AS status_type;
  `;

  const allTypes = rows.map((row) => ({
    value: String(row.status_type),
    label: toVehicleTypeLabel(String(row.status_type)),
  }));

  const data = search
    ? allTypes.filter(
        (item) =>
          normalizeText(item.value).includes(search) ||
          normalizeText(item.label).includes(search),
      )
    : allTypes;

  return {
    total: data.length,
    data,
  };
}

export async function getAmbulanceStatusCounts(prisma, tenantId) {
  const tenant = BigInt(tenantId);
  const rows = await prisma.ambulances.findMany({
    where: {
      tenant_id: tenant,
      is_active: true,
    },
    select: {
      ambulance_id: true,
      status_logs: {
        where: { tenant_id: tenant },
        orderBy: [{ changed_at: "desc" }, { status_id: "desc" }],
        take: 1,
        select: { status: true },
      },
    },
  });

  const counts = {
    available: 0,
    on_trip: 0,
    maintenance: 0,
    reserved: 0,
    inactive: 0,
  };

  for (const row of rows) {
    const status = row.status_logs[0]?.status;
    if (!status) continue;
    const key = String(status);
    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1;
    }
  }

  return {
    available: counts.available,
    onTrip: counts.on_trip,
    maintenance: counts.maintenance,
    reserved: counts.reserved,
    inactive: counts.inactive,
    total: rows.length,
  };
}

export async function getFleetUtilizationDaily(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const dateText = query.date || new Date().toISOString().slice(0, 10);
  const dayStart = new Date(`${dateText}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateText}T23:59:59.999Z`);

  if (Number.isNaN(dayStart.getTime()) || Number.isNaN(dayEnd.getTime())) {
    throw createHttpError("date must be a valid YYYY-MM-DD", 400);
  }

  const rows = await prisma.ambulances.findMany({
    where: {
      tenant_id: tenant,
      is_active: true,
    },
    orderBy: { vehicle_number: "asc" },
    select: {
      ambulance_id: true,
      vehicle_number: true,
      trips: {
        where: {
          tenant_id: tenant,
          OR: [
            {
              AND: [
                { start_time: { lte: dayEnd } },
                {
                  OR: [
                    { end_time: null },
                    { end_time: { gte: dayStart } },
                  ],
                },
              ],
            },
            {
              AND: [
                { start_time: null },
                { created_at: { gte: dayStart, lte: dayEnd } },
              ],
            },
          ],
        },
        select: {
          start_time: true,
          end_time: true,
          created_at: true,
        },
      },
    },
  });

  return {
    date: dateText,
    items: rows.map((row) => {
      const now = new Date();
      let totalHours = 0;

      for (const trip of row.trips) {
        const tripStart = trip.start_time || trip.created_at;
        const tripEnd = trip.end_time || now;
        if (!tripStart || !tripEnd) continue;

        const start = tripStart > dayStart ? tripStart : dayStart;
        const end = tripEnd < dayEnd ? tripEnd : dayEnd;
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          totalHours += diffMs / (1000 * 60 * 60);
        }
      }

      return {
        vehicleId: row.ambulance_id.toString(),
        vehicleRegNumber: row.vehicle_number,
        hoursUsed: Number(totalHours.toFixed(2)),
        tripsCount: row.trips.length,
      };
    }),
  };
}

export async function getAmbulanceInventoryList(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);
  const search = query.search?.trim() || null;
  const requestedVehicleType = normalizeEnumFilter(query.vehicleType);
  const requestedStatus = normalizeEnumFilter(query.status);
  const vehicleType = requestedVehicleType && requestedVehicleType !== "all"
    ? requestedVehicleType
    : null;
  const status = requestedStatus && requestedStatus !== "all"
    ? requestedStatus
    : null;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));

  let fromDateText = query.fromDate?.trim() || "";
  let toDateText = query.toDate?.trim() || "";

  const todayText = new Date().toISOString().slice(0, 10);
  if (!fromDateText && !toDateText) {
    fromDateText = todayText;
    toDateText = todayText;
  } else if (!fromDateText && toDateText) {
    fromDateText = toDateText;
  } else if (fromDateText && !toDateText) {
    toDateText = fromDateText;
  }

  const fromDate = parseDateOnly(fromDateText, "fromDate");
  const toDate = parseDateOnly(toDateText, "toDate");
  const rangeStart = new Date(`${fromDateText}T00:00:00.000Z`);
  const rangeEnd = new Date(`${toDateText}T23:59:59.999Z`);

  if (fromDate > toDate) {
    throw createHttpError("fromDate cannot be after toDate", 400);
  }

  const rows = await prisma.ambulances.findMany({
    where: {
      tenant_id: tenant,
      is_active: true,
      ...(search
        ? {
            vehicle_number: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
      ...(vehicleType ? { vehicle_type: vehicleType } : {}),
    },
    orderBy: [{ vehicle_number: "asc" }],
    select: {
      ambulance_id: true,
      vehicle_number: true,
      vehicle_type: true,
      status_logs: {
        where: { tenant_id: tenant },
        orderBy: [{ changed_at: "desc" }, { status_id: "desc" }],
        take: 1,
        select: {
          status: true,
          reason: true,
          changed_at: true,
        },
      },
      trips: {
        where: {
          tenant_id: tenant,
          OR: [
            {
              AND: [
                { start_time: { lte: rangeEnd } },
                {
                  OR: [
                    { end_time: null },
                    { end_time: { gte: rangeStart } },
                  ],
                },
              ],
            },
            {
              AND: [
                { start_time: null },
                { created_at: { gte: rangeStart, lte: rangeEnd } },
              ],
            },
          ],
        },
        orderBy: [{ start_time: "desc" }, { created_at: "desc" }, { trip_id: "desc" }],
        select: {
          trip_id: true,
          start_time: true,
          end_time: true,
          created_at: true,
          ambulance_calls: {
            select: {
              pickup_location: true,
              drop_location: true,
            },
          },
        },
      },
    },
  });

  const now = new Date();
  const filtered = rows
    .map((row) => {
      const latestStatus = row.status_logs[0] || null;
      const currentStatus = latestStatus?.status ? String(latestStatus.status) : null;

      if (status && currentStatus !== status) {
        return null;
      }

      let totalHours = 0;
      for (const trip of row.trips) {
        const tripStart = trip.start_time || trip.created_at;
        const tripEnd = trip.end_time || now;
        if (!tripStart || !tripEnd) continue;

        const start = tripStart > rangeStart ? tripStart : rangeStart;
        const end = tripEnd < rangeEnd ? tripEnd : rangeEnd;
        const diffMs = end.getTime() - start.getTime();
        if (diffMs > 0) {
          totalHours += diffMs / (1000 * 60 * 60);
        }
      }

      const activeTrip = row.trips.find((trip) => !trip.end_time) || null;
      let locationOrReason = latestStatus?.reason || null;
      if (currentStatus === "on_trip" && activeTrip?.ambulance_calls?.drop_location) {
        locationOrReason = `En route to ${activeTrip.ambulance_calls.drop_location}`;
      } else if (!locationOrReason && activeTrip?.ambulance_calls?.pickup_location) {
        locationOrReason = `From ${activeTrip.ambulance_calls.pickup_location}`;
      }

      return {
        vehicleId: row.ambulance_id.toString(),
        vehicleRegNumber: row.vehicle_number,
        vehicleType: String(row.vehicle_type),
        vehicleTypeLabel: toVehicleTypeLabel(String(row.vehicle_type)),
        currentStatus: currentStatus || "unknown",
        currentStatusLabel: formatStatusLabel(currentStatus || "unknown"),
        locationOrReason,
        hoursUsed: Number(totalHours.toFixed(2)),
        tripsCount: row.trips.length,
        lastUpdate: latestStatus?.changed_at ? latestStatus.changed_at.toISOString() : null,
      };
    })
    .filter(Boolean);

  const totalRecords = filtered.length;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;
  const skip = (page - 1) * limit;
  const data = filtered.slice(skip, skip + limit);

  return {
    fromDate: fromDateText,
    toDate: toDateText,
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data,
  };
}

export async function createAmbulance(
  prisma,
  tenantId,
  userId,
  facilityId,
  payload,
) {
  const tenant = BigInt(tenantId);
  const changedBy = BigInt(userId);
  const vehicleNumber = String(payload.vehicleRegNumber || "").trim().toUpperCase();
  const vehicleType = String(payload.vehicleType || "").trim();
  const driverName = String(payload.driverName || "").trim();
  const initialStatus = String(payload.initialStatus || "").trim();
  const equipmentNotes = payload.equipmentNotes?.trim() || null;

  if (!vehicleNumber) {
    throw createHttpError("vehicleRegNumber is required", 400);
  }
  if (!driverName) {
    throw createHttpError("driverName is required", 400);
  }

  if (
    !prisma?.ambulances ||
    !prisma?.ambulance_drivers ||
    !prisma?.ambulance_status_logs ||
    !prisma?.tenants
  ) {
    throw createHttpError(
      "Prisma client is out of date for ambulance models. Run 'npx prisma generate' and restart the server.",
      500,
    );
  }

  const tenantExists = await prisma.tenants.findFirst({
    where: { tenant_id: tenant },
    select: { tenant_id: true },
  });

  if (!tenantExists) {
    throw createHttpError("Invalid tenant in token: tenant does not exist", 401);
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let driver = await tx.ambulance_drivers.findFirst({
        where: {
          tenant_id: tenant,
          is_active: true,
          full_name: {
            equals: driverName,
            mode: "insensitive",
          },
        },
        select: {
          driver_id: true,
          full_name: true,
        },
      });

      if (!driver) {
        driver = await tx.ambulance_drivers.create({
          data: {
            tenant_id: tenant,
            full_name: driverName,
            is_active: true,
          },
          select: {
            driver_id: true,
            full_name: true,
          },
        });
      }

      const ambulance = await tx.ambulances.create({
        data: {
          tenant_id: tenant,
          facility_id: facilityId !== null && facilityId !== undefined ? BigInt(facilityId) : null,
          vehicle_number: vehicleNumber,
          vehicle_type: vehicleType,
          equipment_notes: equipmentNotes,
          is_active: true,
        },
        select: {
          ambulance_id: true,
          vehicle_number: true,
          vehicle_type: true,
          equipment_notes: true,
          created_at: true,
        },
      });

      await tx.ambulance_status_logs.create({
        data: {
          tenant_id: tenant,
          ambulance_id: ambulance.ambulance_id,
          status: initialStatus,
          changed_by: changedBy,
          reason: "Initial status set during ambulance creation",
        },
      });

      return { ambulance, driver };
    });

    return {
      ambulanceId: result.ambulance.ambulance_id.toString(),
      vehicleRegNumber: result.ambulance.vehicle_number,
      vehicleType: String(result.ambulance.vehicle_type),
      driverId: result.driver.driver_id.toString(),
      driverName: result.driver.full_name,
      initialStatus,
      equipmentNotes: result.ambulance.equipment_notes || null,
      createdAt: result.ambulance.created_at || null,
    };
  } catch (error) {
    if (error?.code === "P2002") {
      throw createHttpError("Vehicle registration number already exists", 409);
    }
    throw error;
  }
}

export async function updateAmbulanceStatus(prisma, tenantId, userId, payload) {
  const tenant = BigInt(tenantId);
  const changedBy = BigInt(userId);
  const vehicleNumber = String(payload.vehicleRegNumber || "").trim().toUpperCase();
  const status = String(payload.changeStatusTo || "").trim();
  const reason = payload.reason?.trim() || null;
  const changedAt = new Date(payload.statusChangeTime);

  if (!vehicleNumber) {
    throw createHttpError("vehicleRegNumber is required", 400);
  }
  if (Number.isNaN(changedAt.getTime())) {
    throw createHttpError("statusChangeTime must be a valid date-time", 400);
  }
  if ((status === "maintenance" || status === "reserved") && !reason) {
    throw createHttpError("reason is required when status is maintenance or reserved", 400);
  }

  const ambulance = await prisma.ambulances.findFirst({
    where: {
      tenant_id: tenant,
      vehicle_number: {
        equals: vehicleNumber,
        mode: "insensitive",
      },
      is_active: true,
    },
    select: {
      ambulance_id: true,
      vehicle_number: true,
    },
  });

  if (!ambulance) {
    throw createHttpError("Ambulance not found for provided vehicleRegNumber", 404);
  }

  const result = await prisma.$transaction(async (tx) => {
    const latestStatus = await tx.ambulance_status_logs.findFirst({
      where: {
        tenant_id: tenant,
        ambulance_id: ambulance.ambulance_id,
      },
      orderBy: [{ changed_at: "desc" }, { status_id: "desc" }],
      select: {
        status: true,
      },
    });

    const log = await tx.ambulance_status_logs.create({
      data: {
        tenant_id: tenant,
        ambulance_id: ambulance.ambulance_id,
        status,
        reason,
        changed_at: changedAt,
        changed_by: changedBy,
      },
      select: {
        status_id: true,
        status: true,
        reason: true,
        changed_at: true,
      },
    });

    return { latestStatus, log };
  });

  return {
    statusId: result.log.status_id.toString(),
    ambulanceId: ambulance.ambulance_id.toString(),
    vehicleRegNumber: ambulance.vehicle_number,
    previousStatus: result.latestStatus?.status
      ? String(result.latestStatus.status)
      : null,
    currentStatus: String(result.log.status),
    statusChangeTime: result.log.changed_at.toISOString(),
    reason: result.log.reason || null,
    changedBy: changedBy.toString(),
  };
}
