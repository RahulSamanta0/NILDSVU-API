import { createHttpError } from "../ambulance.common.js";

const LOCATION_KEYWORDS = [
  "hospital",
  "clinic",
  "er",
  "opd",
  "icu",
  "ward",
  "triage",
  "center",
  "centre",
];

const PRIORITY_ALIAS = {
  critical: "emergency",
  high: "urgent",
  normal: "normal",
  emergency: "emergency",
  urgent: "urgent",
};

const TYPE_ALIAS = {
  nonpatient: "non_patient",
  "non-patient": "non_patient",
  non_patient: "non_patient",
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

function toNumber(bigintValue) {
  return bigintValue ? Number(bigintValue) : null;
}

function locationContains(fieldName) {
  return LOCATION_KEYWORDS.map((keyword) => ({
    ambulance_calls: {
      is: {
        [fieldName]: {
          contains: keyword,
          mode: "insensitive",
        },
      },
    },
  }));
}

function formatPriority(priorityValue) {
  if (!priorityValue) return null;
  if (priorityValue === "emergency") return "critical";
  if (priorityValue === "urgent") return "high";
  return "normal";
}

function buildTripLogsWhere(tenantId, query = {}) {
  const where = {
    tenant_id: BigInt(tenantId),
  };
  const andConditions = [];

  const tab = normalizeKey(query.tab);
  if (tab === "incoming") {
    andConditions.push({
      NOT: {
        ambulance_calls: {
          is: {
            OR: [
              { call_type: { equals: "non_patient", mode: "insensitive" } },
              { call_type: { equals: "non-patient", mode: "insensitive" } },
            ],
          },
        },
      },
    });
    andConditions.push({
      OR: locationContains("drop_location"),
    });
  } else if (tab === "outgoing") {
    andConditions.push({
      NOT: {
        ambulance_calls: {
          is: {
            OR: [
              { call_type: { equals: "non_patient", mode: "insensitive" } },
              { call_type: { equals: "non-patient", mode: "insensitive" } },
            ],
          },
        },
      },
    });
    andConditions.push({
      OR: locationContains("pickup_location"),
    });
  } else if (tab === "non_patient") {
    andConditions.push({
      ambulance_calls: {
        is: {
          OR: [
            { call_type: { equals: "non_patient", mode: "insensitive" } },
            { call_type: { equals: "non-patient", mode: "insensitive" } },
          ],
        },
      },
    });
  }

  const callTypes = parseCsvList(query.call_types || query.call_type).map(
    (value) => TYPE_ALIAS[value] || value,
  );
  if (callTypes.length) {
    andConditions.push({
      ambulance_calls: {
        is: {
          OR: [...new Set(
            callTypes.flatMap((value) => [
              { call_type: { equals: value, mode: "insensitive" } },
              { call_type: { equals: value.replace(/_/g, "-"), mode: "insensitive" } },
            ]),
          )],
        },
      },
    });
  }

  const priorities = parseCsvList(query.priorities || query.priority).map(
    (value) => PRIORITY_ALIAS[value] || value,
  );
  if (priorities.length) {
    andConditions.push({
      ambulance_calls: {
        is: {
          priority: { in: priorities },
        },
      },
    });
  }

  const search = normalizeText(query.search);
  if (search) {
    const searchOr = [
      {
        drivers: {
          is: {
            full_name: { contains: search, mode: "insensitive" },
          },
        },
      },
      {
        ambulance_calls: {
          is: {
            patient_name: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];

    const numericSearch = Number(search);
    if (Number.isInteger(numericSearch) && numericSearch > 0) {
      searchOr.push({ trip_id: BigInt(numericSearch) });
      searchOr.push({ ambulance_id: BigInt(numericSearch) });
      searchOr.push({ driver_id: BigInt(numericSearch) });
      searchOr.push({ call_id: BigInt(numericSearch) });
    }

    andConditions.push({ OR: searchOr });
  }

  if (andConditions.length) {
    where.AND = andConditions;
  }

  return where;
}

function parseDateOnly(value, fieldName) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} must be a valid YYYY-MM-DD`, 400);
  }
  return date;
}

function toDateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatDayShort(date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

export async function getTripLogsDashboard(prisma, tenantId, query = {}) {
  const tenant = BigInt(tenantId);

  const endDateText = query.endDate?.trim() || toDateKey(new Date());
  parseDateOnly(endDateText, "endDate");
  const endDate = new Date(`${endDateText}T00:00:00.000Z`);
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - 6);
  const startDateText = toDateKey(startDate);

  const rangeStart = new Date(`${startDateText}T00:00:00.000Z`);
  const rangeEnd = new Date(`${endDateText}T23:59:59.999Z`);

  const [tripRows, activeTrips, todayTrips] = await Promise.all([
    prisma.ambulance_trips.findMany({
      where: {
        tenant_id: tenant,
        OR: [
          { start_time: { gte: rangeStart, lte: rangeEnd } },
          { end_time: { gte: rangeStart, lte: rangeEnd } },
          {
            AND: [
              { start_time: null },
              { created_at: { gte: rangeStart, lte: rangeEnd } },
            ],
          },
        ],
      },
      select: {
        start_time: true,
        end_time: true,
        created_at: true,
      },
    }),
    prisma.ambulance_trips.count({
      where: {
        tenant_id: tenant,
        end_time: null,
        trip_status: {
          in: ["started", "reached_pickup", "patient_onboard"],
        },
      },
    }),
    prisma.ambulance_trips.count({
      where: {
        tenant_id: tenant,
        OR: [
          {
            start_time: {
              gte: new Date(`${toDateKey(new Date())}T00:00:00.000Z`),
              lte: new Date(`${toDateKey(new Date())}T23:59:59.999Z`),
            },
          },
          {
            AND: [
              { start_time: null },
              {
                created_at: {
                  gte: new Date(`${toDateKey(new Date())}T00:00:00.000Z`),
                  lte: new Date(`${toDateKey(new Date())}T23:59:59.999Z`),
                },
              },
            ],
          },
        ],
      },
    }),
  ]);

  const buckets = new Map();
  const cursor = new Date(rangeStart);
  while (cursor <= rangeEnd) {
    const key = toDateKey(cursor);
    buckets.set(key, {
      date: key,
      day: formatDayShort(cursor),
      incoming: 0,
      outgoing: 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  for (const trip of tripRows) {
    const outgoingTime = trip.start_time || trip.created_at;
    if (outgoingTime) {
      const outgoingKey = toDateKey(outgoingTime);
      if (buckets.has(outgoingKey)) {
        buckets.get(outgoingKey).outgoing += 1;
      }
    }

    if (trip.end_time) {
      const incomingKey = toDateKey(trip.end_time);
      if (buckets.has(incomingKey)) {
        buckets.get(incomingKey).incoming += 1;
      }
    }
  }

  const trend = Array.from(buckets.values());

  return {
    dateRange: {
      startDate: startDateText,
      endDate: endDateText,
    },
    summary: {
      totalTripsToday: todayTrips,
      activeTrips,
    },
    trend,
  };
}

export async function listTripLogs(prisma, tenantId, query = {}) {
  if (!prisma?.ambulance_trips) {
    throw createHttpError("Database client unavailable", 500);
  }

  const page = toInt(query.page, 1);
  const pageSize = Math.min(toInt(query.pageSize, 10), 100);
  const skip = (page - 1) * pageSize;
  const selectedTab = normalizeKey(query.tab);
  const where = buildTripLogsWhere(tenantId, query);

  const allTabs = [
    { key: "incoming", label: "Incoming Trips" },
    { key: "outgoing", label: "Outgoing Trips" },
    { key: "non_patient", label: "Non Patient" },
  ];
  const tabs =
    selectedTab && selectedTab !== "all"
      ? allTabs.filter((tab) => tab.key === selectedTab)
      : allTabs;

  const [total, rows] = await Promise.all([
    prisma.ambulance_trips.count({ where }),
    prisma.ambulance_trips.findMany({
      where,
      include: {
        ambulances: {
          select: {
            ambulance_id: true,
            vehicle_type: true,
            vehicle_number: true,
          },
        },
        drivers: {
          select: {
            driver_id: true,
            full_name: true,
          },
        },
        ambulance_calls: {
          select: {
            call_id: true,
            call_type: true,
            priority: true,
            pickup_location: true,
            drop_location: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: pageSize,
    }),
  ]);

  const data = rows.map((trip) => ({
    trip_id: toNumber(trip.trip_id),
    vehicle_id: toNumber(trip.ambulances?.ambulance_id || trip.ambulance_id),
    vehicle_type: trip.ambulances?.vehicle_type || null,
    vehicle_number: trip.ambulances?.vehicle_number || null,
    driver_id: toNumber(trip.drivers?.driver_id || trip.driver_id),
    driver_name: trip.drivers?.full_name || null,
    call_id: toNumber(trip.ambulance_calls?.call_id || trip.call_id),
    start_point: trip.ambulance_calls?.pickup_location || null,
    end_point: trip.ambulance_calls?.drop_location || null,
    start_time: trip.start_time ? trip.start_time.toISOString() : null,
    end_time: trip.end_time ? trip.end_time.toISOString() : null,
    status: trip.trip_status || "assigned",
    call_type: trip.ambulance_calls?.call_type || null,
    priority: formatPriority(trip.ambulance_calls?.priority),
  }));

  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    data,
    tabs,
  };
}
