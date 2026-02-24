// Utility to format time to "09:00 AM"
const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }).format(date);
};

// Utility to calculate duration (e.g., "2h 30m")
const calculateDuration = (start, end) => {
  const diffMs = end.getTime() - start.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHrs}h ${diffMins}m`;
};

/**
 * Get all vendor logs with formatted data
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user object with tenant_id
 * @returns {Array} Formatted vendor logs
 */
const getAllVendorLogs = async (prisma, user) => {
  const tenantId = BigInt(user.tenant_id);
  
  const vendorTypes = ["Vendor", "Contractor", "Supplier", "Service Provider"];

  const logs = await prisma.visitor_entries.findMany({
    where: {
      tenant_id: tenantId,
      visitor_type: { in: vendorTypes },
    },
    orderBy: { entry_time: "desc" },
  });

  const now = new Date();
  const OVERSTAY_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours threshold for vendors

  const formattedLogs = logs.map((log) => {
    const isInside = log.status === "checkin";
    const durationEnd = isInside ? now : (log.exit_time || now);
    const durationMs = durationEnd.getTime() - log.entry_time.getTime();
    
    // Determine UI status
    let uiStatus = isInside ? "Inside" : "Exited";
    if (isInside && durationMs > OVERSTAY_THRESHOLD_MS) {
      uiStatus = "Overstay";
    }

    return {
      id: log.visitor_pass_number,
      vendorName: log.visitor_name,
      company: log.company_name || "N/A",
      contactNumber: log.mobile,
      vendorType: log.visitor_type,
      department: log.department,
      entryTime: formatTime(log.entry_time),
      exitTime: log.exit_time ? formatTime(log.exit_time) : "-",
      duration: calculateDuration(log.entry_time, durationEnd),
      status: uiStatus,
      purpose: log.purpose,
      gate: log.gate_number,
      entry_id: log.entry_id.toString(),
      tenant_id: log.tenant_id.toString(),
    };
  });

  return formattedLogs;
};

/**
 * Checkout vendor - update status to checkout and record exit time
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user object with tenant_id
 * @param {String} passNumber - Vendor pass number
 * @returns {Object} Updated vendor entry
 */
const checkoutVendor = async (prisma, user, passNumber) => {
  const tenantId = BigInt(user.tenant_id);

  // Verify the entry exists and belongs to this tenant
  const existingEntry = await prisma.visitor_entries.findUnique({
    where: { visitor_pass_number: passNumber },
  });

  if (!existingEntry) {
    throw new Error("Vendor entry not found");
  }

  if (existingEntry.tenant_id !== tenantId) {
    throw new Error("Unauthorized access to vendor entry");
  }

  if (existingEntry.status === "checkout") {
    throw new Error("Vendor already checked out");
  }

  const updatedEntry = await prisma.visitor_entries.update({
    where: { visitor_pass_number: passNumber },
    data: {
      status: "checkout",
      exit_time: new Date(),
    },
  });

  return {
    ...updatedEntry,
    entry_id: updatedEntry.entry_id.toString(),
    tenant_id: updatedEntry.tenant_id.toString(),
  };
};

/**
 * Get vendor dashboard statistics
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user object with tenant_id
 * @returns {Object} Dashboard statistics
 */
const getVendorDashboardStats = async (prisma, user) => {
  const tenantId = BigInt(user.tenant_id);
  
  const vendorTypes = ["Vendor", "Contractor", "Supplier", "Service Provider"];
  
  // Get start and end of today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // 1. Total Entries Today
  const totalEntriesToday = await prisma.visitor_entries.count({
    where: {
      tenant_id: tenantId,
      visitor_type: { in: vendorTypes },
      entry_time: { gte: startOfToday, lte: endOfToday },
    },
  });

  // 2. Completed Visits Today
  const completedVisits = await prisma.visitor_entries.count({
    where: {
      tenant_id: tenantId,
      visitor_type: { in: vendorTypes },
      status: "checkout",
      exit_time: { gte: startOfToday, lte: endOfToday },
    },
  });

  // 3. Vendors Currently Inside (Regardless of what day they entered)
  const activeVendors = await prisma.visitor_entries.findMany({
    where: {
      tenant_id: tenantId,
      visitor_type: { in: vendorTypes },
      status: "checkin",
    },
    select: { entry_time: true }
  });

  // 4. Overstay / Issues Calculation
  const now = new Date();
  const OVERSTAY_THRESHOLD_MS = 6 * 60 * 60 * 1000; // 6 hours for vendors
  let overstayCount = 0;

  activeVendors.forEach(vendor => {
    const durationMs = now.getTime() - vendor.entry_time.getTime();
    if (durationMs > OVERSTAY_THRESHOLD_MS) {
      overstayCount++;
    }
  });

  return {
    vendorsInside: activeVendors.length.toString(),
    totalEntriesToday: totalEntriesToday.toString(),
    completedVisits: completedVisits.toString(),
    overstays: overstayCount.toString(),
  };
};

export {
  getAllVendorLogs,
  checkoutVendor,
  getVendorDashboardStats,
};
