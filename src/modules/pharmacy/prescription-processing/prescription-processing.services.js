import {
  buildFullName,
  buildPatientLocation,
  createHttpError,
  getUserDisplayName,
  parseBigIntSearch,
  toSafeNumber,
} from "../pharmacy.common.js";

export async function getPrescriptionProcessingList(prisma, tenantId, query) {
  const tab = query.tab || "queue";
  const status = query.status;
  const priority = query.priority || "all";
  const search = query.search?.trim();
  const token = query.token?.trim();
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.max(1, Number(query.limit || 10));
  const skip = (page - 1) * limit;

  const where = {
    tenant_id: BigInt(tenantId),
    is_active: true,
  };

  if (status) {
    where.status = status;
  } else if (tab === "completed") {
    where.status = "completed";
  } else if (tab === "cancelled") {
    where.status = "cancelled";
  } else {
    where.status = { in: ["pending", "processing"] };
  }

  if (priority === "normal") {
    where.priority = "normal";
  } else if (priority === "urgent" || priority === "high") {
    where.priority = { in: ["urgent", "emergency"] };
  }

  if (token) {
    const tokenDigits = token.replace(/\D/g, "");
    const parsedToken = parseBigIntSearch(tokenDigits);
    if (parsedToken !== null && parsedToken <= BigInt(Number.MAX_SAFE_INTEGER)) {
      where.opd_visits = { token_number: Number(parsedToken) };
    } else {
      where.opd_visits = { token_number: -1 };
    }
  }

  if (search) {
    const parsedId = parseBigIntSearch(search);
    where.OR = [
      { patients: { first_name: { contains: search, mode: "insensitive" } } },
      { patients: { middle_name: { contains: search, mode: "insensitive" } } },
      { patients: { last_name: { contains: search, mode: "insensitive" } } },
      { patients: { upid: { contains: search, mode: "insensitive" } } },
      {
        users_prescriptions_doctor_idTousers: {
          staff_profiles: {
            first_name: { contains: search, mode: "insensitive" },
          },
        },
      },
      {
        users_prescriptions_doctor_idTousers: {
          staff_profiles: {
            last_name: { contains: search, mode: "insensitive" },
          },
        },
      },
      { opd_visits: { visit_number: { contains: search, mode: "insensitive" } } },
    ];

    if (parsedId !== null) {
      where.OR.push({ patient_id: parsedId });
      where.OR.push({ doctor_id: parsedId });
      where.OR.push({ prescription_id: parsedId });
      where.OR.push({ opd_visits: { token_number: Number(parsedId) } });
    }
  }

  const [totalRecords, rows] = await prisma.$transaction([
    prisma.prescriptions.count({ where }),
    prisma.prescriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ prescription_date: "desc" }, { created_at: "desc" }],
      select: {
        prescription_id: true,
        patient_id: true,
        doctor_id: true,
        prescription_date: true,
        created_at: true,
        priority: true,
        status: true,
        patients: {
          select: {
            upid: true,
            first_name: true,
            middle_name: true,
            last_name: true,
          },
        },
        opd_visits: { select: { token_number: true, visit_number: true } },
        users_prescriptions_doctor_idTousers: {
          select: {
            staff_profiles: { select: { first_name: true, last_name: true } },
          },
        },
        _count: { select: { prescription_items: true } },
        prescription_items: {
          select: {
            drug_name: true,
            quantity: true,
            drugs: { select: { drug_name: true } },
          },
          orderBy: [{ created_at: "asc" }],
        },
      },
    }),
  ]);

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

  const data = rows.map((row) => {
    const doctorProfile = row.users_prescriptions_doctor_idTousers?.staff_profiles;
    return {
      prescriptionId: row.prescription_id.toString(),
      patientId: row.patient_id.toString(),
      patientName: buildFullName(
        row.patients?.first_name,
        row.patients?.middle_name,
        row.patients?.last_name,
      ),
      patientUpid: row.patients?.upid || null,
      doctorId: row.doctor_id.toString(),
      doctorName: buildFullName(
        doctorProfile?.first_name,
        null,
        doctorProfile?.last_name,
      ),
      tokenNumber: row.opd_visits?.token_number ?? null,
      visitNumber: row.opd_visits?.visit_number ?? null,
      dateTime: row.prescription_date || row.created_at || null,
      priority: String(row.priority || "normal"),
      drugItems: row._count?.prescription_items || 0,
      status: String(row.status || "pending"),
      medicines: (row.prescription_items || []).map((item) => ({
        medicineName: item.drug_name || item.drugs?.drug_name || null,
        quantity: item.quantity ?? null,
      })),
    };
  });

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: limit,
    data,
  };
}

export async function getPrescriptionProcessingStatusCounts(prisma, tenantId) {
  const baseWhere = { tenant_id: BigInt(tenantId), is_active: true };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [pending, processing, completed, cancelled, todaysPrescriptions] =
    await Promise.all([
      prisma.prescriptions.count({ where: { ...baseWhere, status: "pending" } }),
      prisma.prescriptions.count({
        where: { ...baseWhere, status: "processing" },
      }),
      prisma.prescriptions.count({
        where: { ...baseWhere, status: "completed" },
      }),
      prisma.prescriptions.count({
        where: { ...baseWhere, status: "cancelled" },
      }),
      prisma.prescriptions.findMany({
        where: {
          ...baseWhere,
          prescription_date: { gte: startOfToday, lt: startOfTomorrow },
        },
        select: { patient_id: true },
        distinct: ["patient_id"],
      }),
    ]);

  return {
    queue: pending + processing,
    pending,
    processing,
    completed,
    cancelled,
    todayPatients: todaysPrescriptions.length,
  };
}

export async function getPrescriptionDetailsById(prisma, tenantId, prescriptionId) {
  const tenant = BigInt(tenantId);
  const id = BigInt(prescriptionId);

  const prescription = await prisma.prescriptions.findFirst({
    where: { tenant_id: tenant, prescription_id: id, is_active: true },
    select: {
      prescription_id: true,
      patient_id: true,
      prescription_date: true,
      created_at: true,
      patients: {
        select: {
          patient_id: true,
          upid: true,
          first_name: true,
          middle_name: true,
          last_name: true,
          gender: true,
          date_of_birth: true,
          address_line1: true,
          address_line2: true,
          city: true,
          state: true,
          pincode: true,
          is_divyangjan: true,
          is_emergency: true,
          patient_allergies: {
            where: { tenant_id: tenant, is_active: true },
            select: { allergen: true, severity: true, reaction: true },
            orderBy: { created_at: "desc" },
          },
        },
      },
      users_prescriptions_doctor_idTousers: {
        select: {
          username: true,
          email: true,
          staff_profiles: { select: { first_name: true, last_name: true } },
        },
      },
      opd_visits: {
        select: {
          visit_date: true,
          visit_time: true,
          reason_for_visit: true,
          opd_consultations: {
            select: {
              past_medical_history: true,
              past_surgical_history: true,
              family_history: true,
            },
          },
        },
      },
      prescription_items: {
        select: {
          drug_name: true,
          frequency: true,
          strength: true,
          duration: true,
        },
        orderBy: { created_at: "asc" },
      },
    },
  });

  if (!prescription) {
    throw createHttpError("Prescription not found for provided prescriptionId", 404);
  }

  const patient = prescription.patients;
  const consultation = prescription.opd_visits?.opd_consultations;
  const allergies = patient?.patient_allergies || [];

  const medicalAlerts = [];
  if (allergies.some((a) => (a.severity || "").toLowerCase().includes("severe"))) {
    medicalAlerts.push("Severe allergy history");
  }
  if (patient?.is_emergency) medicalAlerts.push("Emergency case history");
  if (patient?.is_divyangjan) medicalAlerts.push("Special support required");

  const patientName = [patient?.first_name, patient?.middle_name, patient?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const medicalSurgicalHistory = [
    consultation?.past_medical_history,
    consultation?.past_surgical_history,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    prescriptionId: prescription.prescription_id.toString(),
    patientId: patient?.patient_id?.toString() || prescription.patient_id.toString(),
    patientUpid: patient?.upid || null,
    patientName,
    gender: patient?.gender ? String(patient.gender) : null,
    dateOfBirth: patient?.date_of_birth || null,
    nationality: null,
    location: buildPatientLocation(patient) || null,
    allergies: allergies.map((item) => ({
      allergen: item.allergen,
      severity: item.severity || null,
      reaction: item.reaction || null,
    })),
    medicalAlerts,
    medicalSurgicalHistory: medicalSurgicalHistory || null,
    familyHistory: consultation?.family_history || null,
    admissionDateTime: prescription.prescription_date || prescription.created_at || null,
    principalDoctor: getUserDisplayName(
      prescription.users_prescriptions_doctor_idTousers,
    ),
    orderContext: prescription.opd_visits?.reason_for_visit || null,
    medicationOrderList: prescription.prescription_items.map((item) => ({
      medicineName: item.drug_name,
      instructionFrequency: item.frequency || null,
      dosage: item.strength || null,
      duration: item.duration || null,
    })),
  };
}

export async function updatePrescriptionDecision(
  prisma,
  tenantId,
  prescriptionId,
  decision,
  actionByUserId,
  approvedByInput,
  rejectedByInput,
) {
  const tenant = BigInt(tenantId);
  const id = BigInt(prescriptionId);
  const actionUserId = BigInt(actionByUserId);
  const actionAt = new Date();

  const existing = await prisma.prescriptions.findFirst({
    where: { tenant_id: tenant, prescription_id: id, is_active: true },
    select: {
      prescription_id: true,
      status: true,
      approved_by: true,
      rejected_by: true,
    },
  });

  if (!existing) {
    throw createHttpError("Prescription not found for provided prescriptionId", 404);
  }

  if (
    existing.status === "completed" ||
    existing.status === "cancelled" ||
    existing.approved_by !== null ||
    existing.rejected_by !== null
  ) {
    throw createHttpError(
      "Prescription has already been decided and cannot be approved/rejected again",
      409,
    );
  }

  const nextStatus = decision === "approved" ? "completed" : "cancelled";

  const guardedUpdate = await prisma.prescriptions.updateMany({
    where: {
      tenant_id: tenant,
      prescription_id: id,
      is_active: true,
      status: { in: ["pending", "processing"] },
      approved_by: null,
      rejected_by: null,
    },
    data:
      decision === "approved"
        ? {
            status: nextStatus,
            approved_by: actionUserId,
            approved_at: actionAt,
          }
        : {
            status: nextStatus,
            rejected_by: actionUserId,
            rejected_at: actionAt,
          },
  });

  if (guardedUpdate.count === 0) {
    throw createHttpError(
      "Prescription has already been decided and cannot be approved/rejected again",
      409,
    );
  }

  const updated = await prisma.prescriptions.findFirst({
    where: { tenant_id: tenant, prescription_id: id },
    select: {
      prescription_id: true,
      status: true,
      approved_at: true,
      rejected_at: true,
      users_prescriptions_approved_byTousers: {
        select: {
          username: true,
          email: true,
          staff_profiles: { select: { first_name: true, last_name: true } },
        },
      },
      users_prescriptions_rejected_byTousers: {
        select: {
          username: true,
          email: true,
          staff_profiles: { select: { first_name: true, last_name: true } },
        },
      },
    },
  });

  if (!updated) {
    throw createHttpError("Prescription not found after update", 404);
  }

  const approvedActorName = getUserDisplayName(
    updated.users_prescriptions_approved_byTousers,
  );
  const rejectedActorName = getUserDisplayName(
    updated.users_prescriptions_rejected_byTousers,
  );

  return {
    prescriptionId: updated.prescription_id.toString(),
    status: String(updated.status || nextStatus),
    approvedByName:
      decision === "approved"
        ? (approvedByInput?.trim() || approvedActorName)
        : null,
    rejectedByName:
      decision === "rejected"
        ? (rejectedByInput?.trim() || rejectedActorName)
        : null,
    approvedAt: decision === "approved" ? updated.approved_at || actionAt : null,
    rejectedAt: decision === "rejected" ? updated.rejected_at || actionAt : null,
  };
}
