// Utility to format time to "09:00 AM"
const formatTime = (date) => {
  return new Intl.DateTimeFormat('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }).format(date);
};

// Utility to calculate duration from entry time to now
const calculateDuration = (start) => {
  const diffMs = new Date().getTime() - start.getTime();
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${diffHrs}h ${diffMins}m`;
};

/**
 * Create new parking entry
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user object with tenant_id
 * @param {Object} data - Parking entry data
 * @returns {Object} Created parking entry
 */
export async function createParkingEntry(prisma, user, data) {
  const tenantId = BigInt(user.tenant_id);
  const { vehicleNumber, vehicleType, driverName, parkingSlot } = data;

  // Validate required fields
  if (!vehicleNumber || !vehicleType || !driverName || !parkingSlot) {
    throw new Error("Missing required fields: vehicleNumber, vehicleType, driverName, parkingSlot");
  }

  const newEntry = await prisma.parking_entries.create({
    data: {
      tenant_id: tenantId,
      vehicle_number: vehicleNumber,
      vehicle_type: vehicleType,
      driver_name: driverName,
      parking_slot: parkingSlot,
      status: "parked",
      entry_time: new Date(),
    },
  });

  return {
    ...newEntry,
    entry_id: newEntry.entry_id.toString(),
    tenant_id: newEntry.tenant_id.toString(),
  };
}

/**
 * Get all parked vehicles
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user object with tenant_id
 * @returns {Array} List of parked vehicles with formatted data
 */
export async function getAllParkedVehicles(prisma, user) {
  const tenantId = BigInt(user.tenant_id);

  const parkedVehicles = await prisma.parking_entries.findMany({
    where: {
      tenant_id: tenantId,
      status: "parked",
    },
    orderBy: { entry_time: "desc" },
  });

  // Map to frontend structure with formatted data
  const formattedData = parkedVehicles.map((v) => ({
    id: `V-${v.entry_id.toString().padStart(3, '0')}`,
    entry_id: v.entry_id.toString(),
    number: v.vehicle_number,
    type: v.vehicle_type,
    driver: v.driver_name,
    slot: v.parking_slot,
    entryTime: formatTime(v.entry_time),
    duration: calculateDuration(v.entry_time),
    status: v.status,
    tenant_id: v.tenant_id.toString(),
  }));

  return formattedData;
}

/**
 * Get parking dashboard statistics
 * @param {Object} prisma - Prisma client instance
 * @param {Object} user - Authenticated user object with tenant_id
 * @returns {Object} Parking statistics (total, occupied, available, reserved)
 */
export async function getParkingStats(prisma, user) {
  const tenantId = BigInt(user.tenant_id);

  // Configuration for the parking lot capacity
  // TODO: Move to tenant_settings table for dynamic configuration
  const TOTAL_SLOTS = 120;
  const RESERVED_SLOTS = 10;

  // Count currently parked vehicles
  const occupiedCount = await prisma.parking_entries.count({
    where: {
      tenant_id: tenantId,
      status: "parked",
    },
  });

  // Calculate available slots
  const availableCount = TOTAL_SLOTS - occupiedCount - RESERVED_SLOTS;

  return {
    total: TOTAL_SLOTS,
    occupied: occupiedCount,
    available: availableCount > 0 ? availableCount : 0,
    reserved: RESERVED_SLOTS,
  };
}
