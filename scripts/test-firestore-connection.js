#!/usr/bin/env node
/**
 * Test script to verify Firestore connection and data structure
 * Usage: node scripts/test-firestore-connection.js
 */

const { initFirebaseAdmin } = require('../lib/firebase');

async function testConnection() {
  try {
    console.log('🔍 Testing Firestore connection...\n');
    
    const admin = initFirebaseAdmin();
    const db = admin.firestore();
    
    // Test reading from over_predictions
    const overPredictionsCol = db.collection('over_predictions');
    const weekId = '03-09-11-2025'; // From the screenshot
    
    console.log(`📖 Reading week document: ${weekId}`);
    const weekDoc = overPredictionsCol.doc(weekId);
    const weekDocSnap = await weekDoc.get();
    
    if (!weekDocSnap.exists) {
      console.log('❌ Week document does not exist');
      return;
    }
    
    console.log('✅ Week document exists');
    console.log('   Data:', JSON.stringify(weekDocSnap.data(), null, 2));
    
    // Check Sunday subcollection
    console.log('\n📖 Reading Sunday subcollection...');
    const sundayCol = weekDoc.collection('Sunday');
    const sundaySnapshot = await sundayCol.get();
    
    console.log(`   Found ${sundaySnapshot.size} date document(s)`);
    
    for (const dateDoc of sundaySnapshot.docs) {
      console.log(`\n   📄 Date document: ${dateDoc.id}`);
      const data = dateDoc.data();
      const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
      console.log(`   📊 Predictions count: ${predictions.length}`);
      
      if (predictions.length > 0) {
        console.log('   First prediction:', JSON.stringify(predictions[0], null, 2));
      }
    }
    
    // Test current week calculation
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayDD = String(monday.getDate()).padStart(2, '0');
    const sundayDD = String(sunday.getDate()).padStart(2, '0');
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const yyyy = monday.getFullYear();
    const currentWeekId = `${mondayDD}-${sundayDD}-${mm}-${yyyy}`;
    
    console.log(`\n📅 Current week ID: ${currentWeekId}`);
    console.log(`   Today: ${today.toISOString().split('T')[0]}`);
    
    // Test reading current week
    console.log(`\n📖 Reading current week document: ${currentWeekId}`);
    const currentWeekDoc = overPredictionsCol.doc(currentWeekId);
    const currentWeekSnap = await currentWeekDoc.get();
    
    if (currentWeekSnap.exists) {
      console.log('✅ Current week document exists');
      
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let totalPredictions = 0;
      
      for (const day of daysOfWeek) {
        const dayCol = currentWeekDoc.collection(day);
        const datesSnapshot = await dayCol.get();
        
        if (!datesSnapshot.empty) {
          console.log(`   ${day}: ${datesSnapshot.size} date(s)`);
          
          for (const dateDoc of datesSnapshot.docs) {
            const data = dateDoc.data();
            const predictions = Array.isArray(data?.predictions) ? data.predictions : [];
            totalPredictions += predictions.length;
            console.log(`      ${dateDoc.id}: ${predictions.length} prediction(s)`);
          }
        }
      }
      
      console.log(`\n✅ Total predictions in current week: ${totalPredictions}`);
    } else {
      console.log('❌ Current week document does not exist');
    }
    
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testConnection();

