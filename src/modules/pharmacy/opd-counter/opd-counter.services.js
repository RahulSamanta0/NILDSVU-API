import { Prisma } from "../../../generated/prisma/index.js";
import {
  buildFullName,
  createHttpError,
  getUserDisplayName,
  parseBigIntSearch,
  toSafeInteger,
  toSafeNumber,
} from "../pharmacy.common.js";

export async function getMedicineList(prisma, tenantId, query = {}) {
  const search = query.search?.trim();
  const inStockOnly =
    query.inStockOnly === true ||
    query.inStockOnly === "true" ||
    query.inStockOnly === 1 ||
    query.inStockOnly === "1";

  const tenantIdBigInt = BigInt(tenantId);
  const searchLike = search ? `%${search}%` : null;

  const whereParts = [Prisma.sql`d.tenant_id = ${tenantIdBigInt}`];
  whereParts.push(Prisma.sql`d.is_active = TRUE`);

  if (searchLike) {
    whereParts.push(Prisma.sql`(
      d.drug_name ILIKE ${searchLike}
      OR d.drug_code ILIKE ${searchLike}
      OR COALESCE(d.generic_name, '') ILIKE ${searchLike}
      OR COALESCE(d.drug_category, '') ILIKE ${searchLike}
      OR COALESCE(d.dosage_form, '') ILIKE ${searchLike}
      OR COALESCE(d.strength, '') ILIKE ${searchLike}
      OR COALESCE(d.manufacturer, '') ILIKE ${searchLike}
    )`);
  }

  const havingSql = inStockOnly
    ? Prisma.sql`HAVING COALESCE(SUM(ps.quantity_available), 0) > 0`
    : Prisma.empty;

  const whereSql = Prisma.join(whereParts, " AND ");

  const totalRows = await prisma.$queryRaw`
    SELECT COUNT(*)::BIGINT AS total
    FROM (
      SELECT d.drug_id
      FROM drugs d
      LEFT JOIN pharmacy_stock ps
        ON ps.drug_id = d.drug_id
        AND ps.tenant_id = d.tenant_id
      WHERE ${whereSql}
      GROUP BY d.drug_id
      ${havingSql}
    ) AS grouped_drugs;
  `;

  const rows = await prisma.$queryRaw`
    SELECT
      d.drug_id,
      d.drug_code,
      d.drug_name,
      d.generic_name,
      d.drug_category,
      d.dosage_form,
      d.strength,
      d.manufacturer,
      (ARRAY_REMOVE(
        ARRAY_AGG(
          ps.batch_number
          ORDER BY ps.updated_at DESC NULLS LAST, ps.created_at DESC NULLS LAST
        ),
        NULL
      ))[1] AS batch_number,
      COALESCE(SUM(ps.quantity_available), 0)::BIGINT AS quantity_available,
      MIN(ps.unit_price) AS unit_price,
      MIN(ps.mrp) AS mrp
    FROM drugs d
    LEFT JOIN pharmacy_stock ps
      ON ps.drug_id = d.drug_id
      AND ps.tenant_id = d.tenant_id
    WHERE ${whereSql}
    GROUP BY
      d.drug_id,
      d.drug_code,
      d.drug_name,
      d.generic_name,
      d.drug_category,
      d.dosage_form,
      d.strength,
      d.manufacturer
    ${havingSql}
    ORDER BY d.drug_name ASC;
  `;

  const totalRecords = toSafeInteger(totalRows[0]?.total);

  return {
    totalRecords,
    data: rows.map((row) => {
      const quantityAvailable = toSafeInteger(row.quantity_available);
      return {
        medicineId: row.drug_id.toString(),
        drugCode: row.drug_code,
        medicineName: row.drug_name,
        genericName: row.generic_name,
        drugCategory: row.drug_category,
        dosageForm: row.dosage_form,
        strength: row.strength,
        manufacturer: row.manufacturer,
        batchNumber: row.batch_number ?? null,
        quantityAvailable,
        inStock: quantityAvailable > 0,
        unitPrice: toSafeNumber(row.unit_price),
        mrp: toSafeNumber(row.mrp),
      };
    }),
  };
}
export async function getDoctorList(prisma, tenantId, query = {}) {
  const search = query.search?.trim();

  const users = await prisma.users.findMany({
    where: {
      tenant_id: BigInt(tenantId),
      is_active: true,
      user_roles_user_roles_user_idTousers: {
        some: {
          tenant_id: BigInt(tenantId),
          roles: {
            OR: [
              { role_code: { contains: "doctor", mode: "insensitive" } },
              { role_name: { contains: "doctor", mode: "insensitive" } },
            ],
          },
        },
      },
      ...(search
        ? {
            OR: [
              { username: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { employee_id: { contains: search, mode: "insensitive" } },
              {
                staff_profiles: {
                  OR: [
                    { first_name: { contains: search, mode: "insensitive" } },
                    { last_name: { contains: search, mode: "insensitive" } },
                  ],
                },
              },
            ],
          }
        : {}),
    },
    select: {
      user_id: true,
      username: true,
      email: true,
      employee_id: true,
      staff_profiles: {
        select: {
          first_name: true,
          last_name: true,
          designation: true,
          specialization: true,
        },
      },
      user_roles_user_roles_user_idTousers: {
        where: { tenant_id: BigInt(tenantId) },
        select: {
          roles: {
            select: {
              role_id: true,
              role_name: true,
              role_code: true,
            },
          },
        },
      },
    },
    orderBy: [{ staff_profiles: { first_name: "asc" } }, { username: "asc" }],
  });

  return {
    total: users.length,
    data: users.map((user) => {
      const profile = user.staff_profiles;
      const role = user.user_roles_user_roles_user_idTousers[0]?.roles || null;

      return {
        doctorId: user.user_id.toString(),
        doctorName:
          [profile?.first_name, profile?.last_name]
            .filter(Boolean)
            .join(" ")
            .trim() || user.username,
        email: user.email,
        employeeId: user.employee_id,
        designation: profile?.designation || null,
        specialization: profile?.specialization || null,
        roleId: role?.role_id ? Number(role.role_id) : null,
        roleName: role?.role_name || null,
        roleCode: role?.role_code || null,
      };
    }),
  };
}
export async function getPrescriptionMedicinesByPatientUpid(
  prisma,
  tenantId,
  upid,
) {
  const patient = await prisma.patients.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      upid,
    },
    select: {
      patient_id: true,
      first_name: true,
      middle_name: true,
      last_name: true,
      upid: true,
    },
  });

  if (!patient) {
    throw createHttpError("Patient not found for provided UPID", 404);
  }

  const prescription = await prisma.prescriptions.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      patient_id: patient.patient_id,
      is_active: true,
    },
    orderBy: {
      prescription_date: "desc",
    },
    select: {
      prescription_id: true,
      doctor_id: true,
      prescription_date: true,
      created_at: true,
      users_prescriptions_doctor_idTousers: {
        select: {
          user_id: true,
          username: true,
          email: true,
          staff_profiles: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      },
      prescription_items: {
        orderBy: {
          created_at: "asc",
        },
        select: {
          drug_id: true,
          drug_name: true,
          quantity: true,
          drugs: {
            select: {
              drug_id: true,
              drug_name: true,
            },
          },
        },
      },
    },
  });

  if (!prescription) {
    throw createHttpError("No active prescription found for this patient", 404);
  }

  const drugIds = [
    ...new Set(
      prescription.prescription_items
        .map((item) => item.drug_id)
        .filter((id) => id !== null),
    ),
  ];

  let stockByDrugId = new Map();
  if (drugIds.length) {
    const stocks = await prisma.pharmacy_stock.findMany({
      where: {
        tenant_id: BigInt(tenantId),
        drug_id: { in: drugIds },
      },
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
      select: {
        drug_id: true,
        mrp: true,
        unit_price: true,
      },
    });

    for (const stock of stocks) {
      if (!stockByDrugId.has(stock.drug_id)) {
        stockByDrugId.set(
          stock.drug_id,
          toSafeNumber(stock.mrp ?? stock.unit_price),
        );
      }
    }
  }

  return {
    patientUpid: patient.upid,
    patientId: patient.patient_id.toString(),
    patientName: buildFullName(
      patient.first_name,
      patient.middle_name,
      patient.last_name,
    ),
    doctorId: prescription.doctor_id.toString(),
    doctorName: getUserDisplayName(
      prescription.users_prescriptions_doctor_idTousers,
    ),
    prescriptionId: prescription.prescription_id.toString(),
    prescriptionDate: prescription.prescription_date || prescription.created_at,
    medicines: prescription.prescription_items.map((item) => ({
      medicineName: item.drug_name || item.drugs?.drug_name || null,
      quantity: item.quantity ?? null,
      price: item.drug_id ? (stockByDrugId.get(item.drug_id) ?? null) : null,
    })),
  };
}
export async function getPrescriptionMedicinesByPrescriptionId(
  prisma,
  tenantId,
  prescriptionId,
) {
  const parsedPrescriptionId = parseBigIntSearch(String(prescriptionId).trim());

  if (parsedPrescriptionId === null) {
    throw createHttpError("Invalid prescription id", 400);
  }

  const prescription = await prisma.prescriptions.findFirst({
    where: {
      tenant_id: BigInt(tenantId),
      prescription_id: parsedPrescriptionId,
      is_active: true,
    },
    select: {
      prescription_id: true,
      doctor_id: true,
      prescription_date: true,
      created_at: true,
      status: true,
      priority: true,
      patients: {
        select: {
          patient_id: true,
          upid: true,
          first_name: true,
          middle_name: true,
          last_name: true,
        },
      },
      opd_visits: {
        select: {
          token_number: true,
          visit_number: true,
        },
      },
      users_prescriptions_doctor_idTousers: {
        select: {
          user_id: true,
          username: true,
          email: true,
          staff_profiles: {
            select: {
              first_name: true,
              last_name: true,
            },
          },
        },
      },
      prescription_items: {
        orderBy: {
          created_at: "asc",
        },
        select: {
          drug_id: true,
          drug_name: true,
          quantity: true,
          drugs: {
            select: {
              drug_id: true,
              drug_name: true,
            },
          },
        },
      },
    },
  });

  if (!prescription) {
    throw createHttpError("Prescription not found", 404);
  }

  const drugIds = [
    ...new Set(
      prescription.prescription_items
        .map((item) => item.drug_id)
        .filter((id) => id !== null),
    ),
  ];

  let stockByDrugId = new Map();
  if (drugIds.length) {
    const stocks = await prisma.pharmacy_stock.findMany({
      where: {
        tenant_id: BigInt(tenantId),
        drug_id: { in: drugIds },
      },
      orderBy: [{ updated_at: "desc" }, { created_at: "desc" }],
      select: {
        drug_id: true,
        mrp: true,
        unit_price: true,
      },
    });

    for (const stock of stocks) {
      if (!stockByDrugId.has(stock.drug_id)) {
        stockByDrugId.set(
          stock.drug_id,
          toSafeNumber(stock.mrp ?? stock.unit_price),
        );
      }
    }
  }

  return {
    prescriptionId: prescription.prescription_id.toString(),
    patientId: prescription.patients.patient_id.toString(),
    patientUpid: prescription.patients.upid || null,
    patientName: buildFullName(
      prescription.patients.first_name,
      prescription.patients.middle_name,
      prescription.patients.last_name,
    ),
    doctorId: prescription.doctor_id.toString(),
    doctorName: getUserDisplayName(
      prescription.users_prescriptions_doctor_idTousers,
    ),
    tokenNumber: prescription.opd_visits?.token_number ?? null,
    visitNumber: prescription.opd_visits?.visit_number ?? null,
    prescriptionDate:
      prescription.prescription_date || prescription.created_at || null,
    status: prescription.status ? String(prescription.status) : null,
    priority: prescription.priority ? String(prescription.priority) : null,
    medicines: prescription.prescription_items.map((item) => ({
      medicineName: item.drug_name || item.drugs?.drug_name || null,
      quantity: item.quantity ?? null,
      price: item.drug_id ? (stockByDrugId.get(item.drug_id) ?? null) : null,
    })),
  };
}
