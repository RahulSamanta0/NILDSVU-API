/**
 * Doctor OPD Service Layer
 */

function createHttpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return 0;
  const diff = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function buildAddress(patient) {
  const parts = [
    patient.address_line1,
    patient.address_line2,
    patient.city,
    patient.state,
    patient.pincode,
  ].filter(Boolean);
  return parts.join(", ");
}

function generateLabOrderNumber() {
  const stamp = Date.now();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `LAB-${stamp}-${random}`;
}

function getStartAndEndOfDate(dateString) {
  const base = new Date(dateString);
  const start = new Date(base);
  start.setHours(0, 0, 0, 0);
  const end = new Date(base);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

async function resolveVisit(
  prisma,
  tenantId,
  patientId,
  payloadVisitId,
  visitDate,
) {
  if (payloadVisitId) {
    const visit = await prisma.opd_visits.findFirst({
      where: {
        tenant_id: tenantId,
        visit_id: BigInt(payloadVisitId),
        patient_id: patientId,
      },
    });
    if (!visit) {
      throw createHttpError(
        "OPD visit not found for provided visitId and patientId",
        404,
      );
    }
    return visit;
  }

  const { start, end } = getStartAndEndOfDate(visitDate);

  const visit = await prisma.opd_visits.findFirst({
    where: {
      tenant_id: tenantId,
      patient_id: patientId,
      visit_date: { gte: start, lte: end },
    },
    orderBy: { created_at: "desc" },
  });

  if (!visit) {
    throw createHttpError(
      "No OPD visit found for patientId on visitDate. Pass visitId if needed.",
      400,
    );
  }

  return visit;
}

async function resolveRecommendedTests(prisma, tenantId, recommendedTests) {
  if (!recommendedTests?.length) return [];

  const resolved = await Promise.all(
    recommendedTests.map(async (testName) => {
      const test = await prisma.lab_tests.findFirst({
        where: {
          tenant_id: tenantId,
          test_name: { equals: testName, mode: "insensitive" },
        },
        select: { test_id: true, test_name: true, sample_type: true },
      });
      return { input: testName, test };
    }),
  );

  const missing = resolved.filter((r) => !r.test).map((r) => r.input);

  if (missing.length) {
    throw createHttpError(
      `Recommended tests not found in master: ${missing.join(", ")}`,
      400,
    );
  }

  return resolved.map((r) => r.test);
}

export async function createPrescription(
  prisma,
  payload,
  tenantId,
  fallbackDoctorId,
) {
  const patientId = BigInt(payload.patientId);

  const patient = await prisma.patients.findFirst({
    where: { tenant_id: tenantId, patient_id: patientId },
  });

  if (!patient) {
    throw createHttpError("Patient not found", 404);
  }

  const visit = await resolveVisit(
    prisma,
    tenantId,
    patientId,
    payload.visitId,
    payload.visitDate,
  );

  // 🚫 Prevent duplicate prescription for same visit
  const existingPrescription = await prisma.prescriptions.findFirst({
    where: {
      tenant_id: tenantId,
      visit_id: visit.visit_id,
      is_active: true,
    },
  });

  if (existingPrescription) {
    throw createHttpError(
      "Prescription already exists for this visit. Update it instead.",
      409,
    );
  }

  const doctorId = payload.doctorId
    ? BigInt(payload.doctorId)
    : visit.doctor_id || fallbackDoctorId;

  if (!doctorId) {
    throw createHttpError(
      "Doctor is required. Provide doctorId in request.",
      400,
    );
  }

  const resolvedTests = await resolveRecommendedTests(
    prisma,
    tenantId,
    payload.recommendedTests || [],
  );

  // 🚫 Prevent duplicate medicines in request
  const medicineNames = payload.prescribedMedicines.map((m) =>
    m.medicineName.trim().toLowerCase(),
  );

  const duplicateMeds = medicineNames.filter(
    (name, index) => medicineNames.indexOf(name) !== index,
  );

  if (duplicateMeds.length) {
    throw createHttpError(
      `Duplicate medicines not allowed: ${[...new Set(duplicateMeds)].join(", ")}`,
      400,
    );
  }

  const output = await prisma.$transaction(async (tx) => {
    const prescription = await tx.prescriptions.create({
      data: {
        tenant_id: tenantId,
        visit_id: visit.visit_id,
        patient_id: patientId,
        doctor_id: doctorId,
        prescription_date: new Date(payload.visitDate),
      },
    });

    await tx.prescription_items.createMany({
      data: payload.prescribedMedicines.map((medicine) => ({
        tenant_id: tenantId,
        prescription_id: prescription.prescription_id,
        drug_name: medicine.medicineName,
        strength: `${medicine.dose} mg`,
        frequency: medicine.frequency || null,
        duration: medicine.duration,
        is_free_text: true,
      })),
    });

    await tx.opd_consultations.upsert({
      where: {
        tenant_id_visit_id: {
          tenant_id: tenantId,
          visit_id: visit.visit_id,
        },
      },
      create: {
        tenant_id: tenantId,
        visit_id: visit.visit_id,
        provisional_diagnosis: payload.diseaseSummary,
        clinical_notes: payload.symptomAndHistory,
        doctor_id: doctorId,
      },
      update: {
        provisional_diagnosis: payload.diseaseSummary,
        clinical_notes: payload.symptomAndHistory,
        doctor_id: doctorId,
      },
    });

    let labOrder = null;

    if (resolvedTests.length) {
      labOrder = await tx.lab_test_orders.create({
        data: {
          tenant_id: tenantId,
          facility_id: visit.facility_id,
          order_number: generateLabOrderNumber(),
          patient_id: patientId,
          visit_id: visit.visit_id,
          ordering_doctor_id: doctorId,
        },
      });

      await tx.lab_test_items.createMany({
        data: resolvedTests.map((test) => ({
          tenant_id: tenantId,
          order_id: labOrder.order_id,
          test_id: test.test_id,
          test_name: test.test_name,
          sample_type: test.sample_type,
        })),
      });
    }

    const fullName = [
      patient.first_name,
      patient.middle_name,
      patient.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    return {
      prescriptionId: prescription.prescription_id.toString(),
      patientId: patientId.toString(),
      visitId: visit.visit_id.toString(),
      doctorId: doctorId.toString(),
      visitDate: prescription.prescription_date || prescription.created_at,
      patientName: payload.patientName || fullName,
      age: payload.age ?? calculateAge(patient.date_of_birth),
      gender: payload.gender || String(patient.gender),
      mobileNumber: payload.mobileNumber || patient.mobile_primary,
      address: payload.address || buildAddress(patient),
      diseaseSummary: payload.diseaseSummary,
      symptomAndHistory: payload.symptomAndHistory,
      prescribedMedicines: payload.prescribedMedicines,
      recommendedTests: payload.recommendedTests || [],
      labOrderId: labOrder?.order_id?.toString() || null,
      createdAt: prescription.created_at,
    };
  });

  return output;
}
export async function getOpdPatients(
  prisma,
  tenantId,
  { fromDate, toDate, type = "all", page = 1, offset = 10 },
) {
  const where = {
    tenant_id: BigInt(tenantId),
  };

  /* -------------------------
     Date Filter Logic
  -------------------------- */

  if (fromDate && toDate) {
    where.visit_date = { gte: fromDate, lte: toDate };
  } else if (fromDate) {
    where.visit_date = { gte: fromDate };
  } else if (toDate) {
    where.visit_date = { lt: toDate }; // for previous
  }

  /* -------------------------
     Visit Type Filter
  -------------------------- */

  if (type !== "all") {
    where.visit_type = type;
  }

  const skip = (page - 1) * offset;
  const take = offset;

  const [totalRecords, visits] = await prisma.$transaction([
    prisma.opd_visits.count({ where }),
    prisma.opd_visits.findMany({
      where,
      skip,
      take,
      orderBy: { visit_date: "desc" },
      include: {
        patients: {
          select: {
            first_name: true,
            middle_name: true,
            last_name: true,
            date_of_birth: true,
            gender: true,
            mobile_primary: true,
          },
        },
      },
    }),
  ]);

  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / offset) : 0;

  const data = visits.map((visit) => {
    const patient = visit.patients;

    const patientName = [
      patient?.first_name,
      patient?.middle_name,
      patient?.last_name,
    ]
      .filter(Boolean)
      .join(" ");

    let age = null;
    if (patient?.date_of_birth) {
      const dob = new Date(patient.date_of_birth);
      const now = new Date();
      age = now.getFullYear() - dob.getFullYear();

      if (
        now.getMonth() < dob.getMonth() ||
        (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
      ) {
        age--;
      }
    }

    return {
      patientId: visit.visit_number,
      patientName,
      age,
      gender: patient?.gender || "",
      mobile: patient?.mobile_primary || "",
      visitDate: visit.visit_date.toISOString(),
      diseaseSummary: visit.reason_for_visit || "",
      visitType:
        visit.visit_type === "new"
          ? "New Visit"
          : visit.visit_type === "followup"
            ? "Follow Up"
            : "Review",
    };
  });

  return {
    totalRecords,
    totalPages,
    currentPage: page,
    pageSize: offset,
    data,
  };
}

export async function getOpdDashboard(prisma, tenantId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const currentStart = new Date(today);
  currentStart.setDate(currentStart.getDate() - 30);

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - 30);

  /* ----------------------------------------
     1️⃣ Today's Visited Patients
  ----------------------------------------- */
  const todaysVisitedPatients = await prisma.opd_visits.count({
    where: {
      tenant_id: BigInt(tenantId),
      visit_date: today,
    },
  });

  /* ----------------------------------------
     2️⃣ Overall Patients
  ----------------------------------------- */
  const overallPatients = await prisma.patients.count({
    where: {
      tenant_id: BigInt(tenantId),
    },
  });

  /* ----------------------------------------
     3️⃣ Current 30-Day Revisit Rate
  ----------------------------------------- */
  const currentTotal = await prisma.opd_visits.count({
    where: {
      tenant_id: BigInt(tenantId),
      visit_date: { gte: currentStart },
    },
  });

  const currentRevisits = await prisma.opd_visits.count({
    where: {
      tenant_id: BigInt(tenantId),
      visit_date: { gte: currentStart },
      visit_type: { in: ["followup", "review"] },
    },
  });

  const currentRate =
    currentTotal > 0 ? (currentRevisits / currentTotal) * 100 : 0;

  /* ----------------------------------------
     4️⃣ Previous 30-Day Revisit Rate
  ----------------------------------------- */
  const previousTotal = await prisma.opd_visits.count({
    where: {
      tenant_id: BigInt(tenantId),
      visit_date: {
        gte: previousStart,
        lt: currentStart,
      },
    },
  });

  const previousRevisits = await prisma.opd_visits.count({
    where: {
      tenant_id: BigInt(tenantId),
      visit_date: {
        gte: previousStart,
        lt: currentStart,
      },
      visit_type: { in: ["followup", "review"] },
    },
  });

  const previousRate =
    previousTotal > 0 ? (previousRevisits / previousTotal) * 100 : 0;

  /* ----------------------------------------
     5️⃣ Growth %
  ----------------------------------------- */
  let revisitGrowth = 0;

  if (previousRate > 0) {
    revisitGrowth = ((currentRate - previousRate) / previousRate) * 100;
  }

  return {
    todaysVisitedPatients,
    overallPatients,
    revisitRate: Number(currentRate.toFixed(1)),
    revisitGrowth: Number(revisitGrowth.toFixed(1)),
  };
}

export async function getLabTests(prisma, tenant_id) {
  return await prisma.lab_tests.findMany({
    where: {
      tenant_id: BigInt(tenant_id),
      is_active: true,
    },
    orderBy: {
      created_at: "desc",
    },
  });
}

export async function getVisitHistory(prisma, tenant_id, query) {
  const { patient_id, page = 1, limit = 10 } = query;

  const skip = (page - 1) * limit;

  const whereClause = {
    tenant_id: BigInt(tenant_id),
    patient_id: BigInt(patient_id),
  };

  const [visits, total] = await Promise.all([
    prisma.opd_visits.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        visit_date: "desc",
      },
    }),
    prisma.opd_visits.count({
      where: whereClause,
    }),
  ]);

  return {
    visits,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
export async function getPatientDetailsByUpid(prisma, tenantId, upid) {
  const patient = await prisma.patients.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      upid,
    },
    include: {
      patient_allergies: {
        where: {
          tenant_id: BigInt(tenantId),
        },
        orderBy: {
          created_at: "desc",
        },
      },
    },
  });

  if (!patient) {
    throw createHttpError("Patient not found", 404);
  }

  const fullName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const latestVisitWithConsultation = await prisma.opd_visits.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      patient_id: patient.patient_id,
      opd_consultations: {
        isNot: null,
      },
    },
    orderBy: [{ visit_date: "desc" }, { created_at: "desc" }],
    select: {
      opd_consultations: {
        select: {
          chief_complaint: true,
          provisional_diagnosis: true,
        },
      },
    },
  });

  const consultation = latestVisitWithConsultation?.opd_consultations;

  return {
    patientId: patient.patient_id.toString(),
    upid: patient.upid,
    firstName: patient.first_name,
    middleName: patient.middle_name || null,
    lastName: patient.last_name || null,
    fullName,
    dateOfBirth: patient.date_of_birth,
    age: patient.date_of_birth ? calculateAge(patient.date_of_birth) : null,
    gender: String(patient.gender),
    bloodGroup: patient.blood_group || null,
    mobileNumber: patient.mobile_primary || null,
    alternateMobileNumber: patient.mobile_secondary || null,
    email: patient.email || null,
    addressLine1: patient.address_line1 || null,
    addressLine2: patient.address_line2 || null,
    city: patient.city || null,
    state: patient.state || null,
    pincode: patient.pincode || null,
    vitals: patient.vitals || null,
    emergencyContactName: patient.emergency_contact_name || null,
    emergencyContactPhone: patient.emergency_contact_phone || null,
    emergencyContactRelation: patient.emergency_contact_relation || null,
    isDivyangjan: patient.is_divyangjan ?? null,
    registrationDate: patient.registration_date || null,
    clinicalSummary: {
      chiefComplaint: consultation?.chief_complaint || null,
      provisionalDiagnosis: consultation?.provisional_diagnosis || null,
      allergies: patient.patient_allergies.map((allergy) => ({
        allergyId: allergy.allergy_id.toString(),
        allergen: allergy.allergen,
        allergyType: allergy.allergy_type || null,
        severity: allergy.severity || null,
        reaction: allergy.reaction || null,
        identifiedDate: allergy.identified_date || null,
        isActive: allergy.is_active ?? null,
        createdAt: allergy.created_at || null,
      })),
    },
  };
}

export async function getPatientLabResultsByUpid(prisma, tenantId, upid) {
  const tenant = BigInt(tenantId);

  const patient = await prisma.patients.findFirst({
    where: {
      tenant_id: tenant,
      upid,
    },
    select: {
      patient_id: true,
      upid: true,
      first_name: true,
      middle_name: true,
      last_name: true,
    },
  });

  if (!patient) {
    throw createHttpError("Patient not found", 404);
  }

  const orders = await prisma.lab_test_orders.findMany({
    where: {
      tenant_id: tenant,
      patient_id: patient.patient_id,
    },
    orderBy: [{ order_date: "desc" }, { created_at: "desc" }],
    select: {
      order_id: true,
      order_number: true,
      visit_id: true,
      admission_id: true,
      order_date: true,
      priority: true,
      status: true,
      created_at: true,
      lab_test_items: {
        orderBy: [{ result_date: "desc" }, { created_at: "desc" }],
        select: {
          test_item_id: true,
          test_id: true,
          test_name: true,
          sample_type: true,
          result_value: true,
          result_unit: true,
          reference_range: true,
          status: true,
          result_date: true,
          verified_by: true,
          verified_at: true,
          created_at: true,
        },
      },
    },
  });

  const fullName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  const labResults = orders.map((order) => ({
    orderId: order.order_id.toString(),
    orderNumber: order.order_number,
    visitId: order.visit_id ? order.visit_id.toString() : null,
    admissionId: order.admission_id ? order.admission_id.toString() : null,
    orderDate: order.order_date || null,
    priority: order.priority ? String(order.priority) : null,
    status: order.status ? String(order.status) : null,
    createdAt: order.created_at || null,
    tests: order.lab_test_items.map((item) => ({
      testItemId: item.test_item_id.toString(),
      testId: item.test_id.toString(),
      testName: item.test_name,
      sampleType: item.sample_type || null,
      resultValue: item.result_value || null,
      resultUnit: item.result_unit || null,
      referenceRange: item.reference_range || null,
      status: item.status ? String(item.status) : null,
      resultDate: item.result_date || null,
      verifiedBy: item.verified_by ? item.verified_by.toString() : null,
      verifiedAt: item.verified_at || null,
      createdAt: item.created_at || null,
    })),
  }));

  const totalTestItems = labResults.reduce(
    (count, order) => count + order.tests.length,
    0,
  );

  return {
    patientId: patient.patient_id.toString(),
    upid: patient.upid,
    patientName: fullName,
    totalOrders: labResults.length,
    totalTestItems,
    labResults,
  };
}

function normalizeSeverityFromStatus(status) {
  if (!status) return "normal";
  if (status === "completed") return "normal";
  if (status === "in_progress") return "warning";
  return "critical";
}

function buildInvestigationSummary(item) {
  const valuePart = item.result_value ? `${item.result_value}${item.result_unit ? ` ${item.result_unit}` : ""}` : "Result pending";
  const refPart = item.reference_range ? ` | Ref: ${item.reference_range}` : "";
  return `${valuePart}${refPart}`;
}

export async function getDiagnosticReportsByUpid(
  prisma,
  tenantId,
  upid,
  page = 1,
  limit = 10,
) {
  const tenant = BigInt(tenantId);

  const patient = await prisma.patients.findFirst({
    where: {
      tenant_id: tenant,
      upid,
    },
    select: {
      patient_id: true,
      upid: true,
      first_name: true,
      middle_name: true,
      last_name: true,
    },
  });

  if (!patient) {
    throw createHttpError("Patient not found", 404);
  }

  const [radiologyItems, investigationItems] = await Promise.all([
    prisma.radiology_order_items.findMany({
      where: {
        tenant_id: tenant,
        radiology_orders: {
          patient_id: patient.patient_id,
        },
      },
      select: {
        item_id: true,
        study_name: true,
        status: true,
        impressions: true,
        report_text: true,
        performed_at: true,
        verified_at: true,
        created_at: true,
      },
      orderBy: [{ verified_at: "desc" }, { performed_at: "desc" }, { created_at: "desc" }],
    }),
    prisma.lab_test_items.findMany({
      where: {
        tenant_id: tenant,
        lab_test_orders: {
          patient_id: patient.patient_id,
        },
      },
      select: {
        test_item_id: true,
        test_name: true,
        status: true,
        result_value: true,
        result_unit: true,
        reference_range: true,
        result_date: true,
        created_at: true,
      },
      orderBy: [{ result_date: "desc" }, { created_at: "desc" }],
    }),
  ]);

  const radiologyReports = radiologyItems.map((item) => ({
    reportId: item.item_id.toString(),
    type: "radiology",
    title: item.study_name,
    reportDate: item.verified_at || item.performed_at || item.created_at,
    summary: item.impressions || item.report_text || "Report pending",
    status: item.status ? String(item.status) : "pending",
    severity: normalizeSeverityFromStatus(String(item.status || "pending")),
  }));

  const investigationReports = investigationItems.map((item) => ({
    reportId: item.test_item_id.toString(),
    type: "investigation",
    title: item.test_name,
    reportDate: item.result_date || item.created_at,
    summary: buildInvestigationSummary(item),
    status: item.status ? String(item.status) : "pending",
    severity: normalizeSeverityFromStatus(String(item.status || "pending")),
  }));

  const allReports = [...radiologyReports, ...investigationReports].sort((a, b) => {
    const aTime = a.reportDate ? new Date(a.reportDate).getTime() : 0;
    const bTime = b.reportDate ? new Date(b.reportDate).getTime() : 0;
    return bTime - aTime;
  });

  const safePage = Math.max(1, Number(page));
  const safeLimit = Math.max(1, Number(limit));
  const totalRecords = allReports.length;
  const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / safeLimit) : 0;
  const start = (safePage - 1) * safeLimit;
  const data = totalRecords > 0 ? allReports.slice(start, start + safeLimit) : [];

  const fullName = [patient.first_name, patient.middle_name, patient.last_name]
    .filter(Boolean)
    .join(" ");

  return {
    patientId: patient.patient_id.toString(),
    upid: patient.upid,
    patientName: fullName,
    totalRecords,
    totalPages,
    currentPage: safePage,
    pageSize: safeLimit,
    data,
  };
}
