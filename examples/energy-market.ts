/**
 * Energy Market Example
 * 
 * Demonstrates how autonomous robots can trade energy using AutoGrid OS
 */

import {
  EnergyMarketModule,
  EnergySourceType,
  ChargingStationStatus
} from '@autogrid/os';

async function main() {
  // === Setup: Create two robots and a charging station owner ===
  
  // Robot 1: Delivery robot with low battery
  const deliveryRobot = new EnergyMarketModule({
    deviceId: 'robot-delivery-001',
    batteryCapacity: 100, // kWh
    currentCharge: 15,    // Only 15% charge!
    chargingEfficiency: 0.95,
    canTransferEnergy: false
  });

  // Robot 2: Warehouse robot with excess energy
  const warehouseRobot = new EnergyMarketModule({
    deviceId: 'robot-warehouse-002',
    batteryCapacity: 80,
    currentCharge: 72, // 90% charged
    chargingEfficiency: 0.95,
    canTransferEnergy: true, // Can transfer to other robots
    maxTransferRate: 5 // kW
  });

  // Charging Station Owner
  const stationOwner = new EnergyMarketModule({
    deviceId: 'station-owner-001',
    batteryCapacity: 0,
    currentCharge: 0
  });

  // === Register Charging Stations ===
  
  console.log('📍 Registering charging stations...\n');
  
  const fastCharger = stationOwner.registerEnergySource({
    type: EnergySourceType.CHARGING_STATION,
    location: { x: 100, y: 200 },
    capacity: 500, // kWh available
    pricePerKwh: 0.12, // $0.12 per kWh
    connectorTypes: ['CCS', 'CHAdeMO'],
    maxChargingPower: 150, // 150kW fast charger
    metadata: { name: 'FastCharge Hub A' }
  });

  const solarStation = stationOwner.registerEnergySource({
    type: EnergySourceType.SOLAR_PANEL,
    location: { x: 50, y: 100 },
    capacity: 200,
    pricePerKwh: 0.08, // Cheaper solar power
    connectorTypes: ['Type2'],
    maxChargingPower: 22,
    metadata: { name: 'Solar Station Green' }
  });

  console.log(`✅ Registered: ${fastCharger.metadata?.name}`);
  console.log(`   Price: $${fastCharger.pricePerKwh}/kWh, Power: ${fastCharger.maxChargingPower}kW`);
  console.log(`✅ Registered: ${solarStation.metadata?.name}`);
  console.log(`   Price: $${solarStation.pricePerKwh}/kWh, Power: ${solarStation.maxChargingPower}kW\n`);

  // Import sources to delivery robot's view
  deliveryRobot.importEnergySource(fastCharger);
  deliveryRobot.importEnergySource(solarStation);

  // === Scenario 1: Smart Charging Recommendation ===
  
  console.log('🔋 Delivery Robot Battery Status:');
  const batteryStatus = deliveryRobot.getBatteryStatus();
  console.log(`   Charge: ${batteryStatus.percentage.toFixed(1)}%`);
  console.log(`   Capacity: ${batteryStatus.batteryCapacity} kWh`);
  console.log(`   Current: ${batteryStatus.currentCharge} kWh\n`);

  const recommendation = deliveryRobot.getSmartChargingRecommendation();
  console.log('💡 Smart Charging Recommendation:');
  console.log(`   Should charge now: ${recommendation.shouldChargeNow}`);
  console.log(`   Reason: ${recommendation.reason}`);
  if (recommendation.recommendedSource) {
    console.log(`   Recommended station: ${recommendation.recommendedSource.metadata?.name || recommendation.recommendedSource.id}`);
  }
  console.log();

  // === Scenario 2: Create Buy Order ===
  
  console.log('📝 Creating energy buy order...\n');
  
  const buyOrder = deliveryRobot.createBuyOrder({
    energyAmount: 50, // Need 50 kWh
    maxPricePerKwh: 0.15, // Willing to pay up to $0.15
    preferredSourceTypes: [EnergySourceType.SOLAR_PANEL, EnergySourceType.CHARGING_STATION],
    location: { x: 60, y: 120 }, // Robot's current location
    maxDistance: 200,
    urgency: 'high',
    targetBatteryLevel: 80,
    deadline: Date.now() + 3600000 // 1 hour deadline
  });

  console.log(`✅ Order created: ${buyOrder.id}`);
  console.log(`   Status: ${buyOrder.status}`);
  console.log(`   Energy needed: ${buyOrder.energyAmount} kWh`);
  console.log(`   Max price: $${buyOrder.maxPricePerKwh}/kWh\n`);

  // === Scenario 3: Find Available Sources ===
  
  console.log('🔍 Finding available charging sources...\n');
  
  const sources = deliveryRobot.findAvailableSources({
    location: { x: 60, y: 120 },
    maxDistance: 200,
    sourceTypes: [EnergySourceType.SOLAR_PANEL, EnergySourceType.CHARGING_STATION]
  });

  sources.forEach((source, i) => {
    console.log(`   ${i + 1}. ${source.metadata?.name || source.id}`);
    console.log(`      Type: ${source.type}, Price: $${source.pricePerKwh}/kWh`);
    console.log(`      Power: ${source.maxChargingPower}kW, Rating: ${source.rating}⭐`);
  });
  console.log();

  // === Scenario 4: Start Charging Session ===
  
  if (buyOrder.matchedSourceId) {
    console.log('⚡ Starting charging session...\n');
    
    const session = deliveryRobot.startChargingSession(buyOrder.id);
    console.log(`   Session ID: ${session.id}`);
    console.log(`   Status: ${session.status}`);

    // Simulate charging progress
    for (let i = 1; i <= 3; i++) {
      await sleep(100);
      deliveryRobot.updateChargingSession(session.id, {
        energyDelivered: i * 15,
        currentPower: 45
      });
      console.log(`   Progress: ${i * 15} kWh delivered`);
    }

    const completed = deliveryRobot.completeChargingSession(session.id);
    console.log(`\n✅ Charging complete!`);
    console.log(`   Total energy: ${completed.energyDelivered} kWh`);
    console.log(`   Total cost: $${completed.totalCost.toFixed(2)}`);
    console.log(`   Efficiency: ${(completed.efficiency * 100).toFixed(1)}%\n`);
  }

  // === Scenario 5: Peer-to-Peer Energy Transfer ===
  
  console.log('🔄 Peer-to-Peer Energy Transfer Demo\n');

  // Warehouse robot offers energy to delivery robot
  const transfer = warehouseRobot.initiatePeerTransfer({
    toDeviceId: 'robot-delivery-001',
    energyAmount: 10, // Share 10 kWh
    pricePerKwh: 0.10 // Friendly price
  });

  console.log(`   Transfer initiated: ${transfer.id}`);
  console.log(`   From: ${transfer.fromDeviceId}`);
  console.log(`   To: ${transfer.toDeviceId}`);
  console.log(`   Amount: ${transfer.energyAmount} kWh`);
  console.log(`   Price: $${transfer.pricePerKwh}/kWh`);
  console.log(`   Status: ${transfer.status}\n`);

  // === Scenario 6: Energy Forecast ===
  
  console.log('📊 Energy Forecast (next 12 hours)\n');
  
  const forecast = deliveryRobot.generateEnergyForecast(12);
  console.log(`   Predicted consumption: ${forecast.predictedConsumption.toFixed(1)} kWh`);
  console.log(`   Recommended charge time: ${new Date(forecast.recommendedChargeTime || 0).toLocaleTimeString()}`);
  console.log(`   Price range: $${Math.min(...forecast.priceForecasts.map(p => p.price)).toFixed(3)} - $${Math.max(...forecast.priceForecasts.map(p => p.price)).toFixed(3)}/kWh\n`);

  // === Scenario 7: Make a Reservation ===
  
  console.log('📅 Creating charging reservation...\n');
  
  const reservation = deliveryRobot.createReservation({
    sourceId: fastCharger.id,
    startTime: Date.now() + 7200000, // 2 hours from now
    duration: 1800000, // 30 minutes
    estimatedEnergy: 30,
    depositAmount: 5
  });

  console.log(`   Reservation ID: ${reservation.id}`);
  console.log(`   Start: ${new Date(reservation.startTime).toLocaleTimeString()}`);
  console.log(`   Duration: 30 minutes`);
  console.log(`   Estimated energy: ${reservation.estimatedEnergy} kWh`);
  console.log(`   Deposit: $${reservation.depositAmount}`);

  deliveryRobot.confirmReservation(reservation.id);
  console.log(`   Status: confirmed ✅\n`);

  // === Final Stats ===
  
  console.log('📈 Market Statistics\n');
  
  const stats = deliveryRobot.getMarketStats();
  console.log(`   Total energy bought: ${stats.totalEnergyBought} kWh`);
  console.log(`   Total transactions: ${stats.totalTransactions}`);
  console.log(`   Average price: $${stats.averagePricePerKwh.toFixed(3)}/kWh`);
  console.log(`   Grid efficiency: ${(stats.gridEfficiency * 100).toFixed(1)}%`);

  const finalBattery = deliveryRobot.getBatteryStatus();
  console.log(`\n🔋 Final Battery: ${finalBattery.percentage.toFixed(1)}%`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
