#!/usr/bin/env python3
"""
Backend API Testing for Bad Hotel Noordwijk
Tests all backend endpoints with realistic hotel data
"""

import requests
import json
import csv
import io
import os
from datetime import datetime, timedelta
from typing import Dict, Any

# Get backend URL from environment
BACKEND_URL = "https://bad-hotel-dashboard.preview.emergentagent.com/api"

class HotelAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = {}
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        self.test_results[test_name] = {
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
    
    def test_api_root(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "Bad Hotel Noordwijk API" in data.get("message", ""):
                    self.log_test("API Root", True, f"API accessible, version: {data.get('version', 'unknown')}")
                    return True
                else:
                    self.log_test("API Root", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Root", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("API Root", False, f"Connection error: {str(e)}")
            return False
    
    def test_settings_api(self):
        """Test GET and PUT /api/settings"""
        try:
            # Test GET settings
            response = self.session.get(f"{self.base_url}/settings")
            if response.status_code != 200:
                self.log_test("Settings GET", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            settings = response.json()
            required_fields = ["total_rooms", "high_season_target", "low_season_target"]
            
            for field in required_fields:
                if field not in settings:
                    self.log_test("Settings GET", False, f"Missing field: {field}")
                    return False
            
            self.log_test("Settings GET", True, f"Retrieved settings: {settings['total_rooms']} rooms, targets: {settings['high_season_target']}%/{settings['low_season_target']}%")
            
            # Test PUT settings (update)
            update_data = {
                "total_rooms": 26,
                "high_season_target": 88.0,
                "low_season_target": 68.0
            }
            
            response = self.session.put(f"{self.base_url}/settings", params=update_data)
            if response.status_code != 200:
                self.log_test("Settings PUT", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            updated_settings = response.json()
            if updated_settings["total_rooms"] == 26:
                self.log_test("Settings PUT", True, "Settings updated successfully")
                return True
            else:
                self.log_test("Settings PUT", False, f"Settings not updated correctly: {updated_settings}")
                return False
                
        except Exception as e:
            self.log_test("Settings API", False, f"Error: {str(e)}")
            return False
    
    def test_seed_demo_data(self):
        """Test POST /api/seed-demo-data"""
        try:
            response = self.session.post(f"{self.base_url}/seed-demo-data")
            
            if response.status_code != 200:
                self.log_test("Seed Demo Data", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_test("Seed Demo Data", False, f"API returned success=false: {data}")
                return False
            
            reservations_created = data.get("reservations_created", 0)
            if reservations_created > 0:
                self.log_test("Seed Demo Data", True, f"Created {reservations_created} demo reservations")
                return True
            else:
                self.log_test("Seed Demo Data", False, f"No reservations created: {data}")
                return False
                
        except Exception as e:
            self.log_test("Seed Demo Data", False, f"Error: {str(e)}")
            return False
    
    def create_sample_csv(self) -> str:
        """Create a sample CSV file for testing upload"""
        csv_data = []
        today = datetime.now()
        
        # Create realistic reservation data
        for i in range(10):
            check_in = today + timedelta(days=i)
            check_out = check_in + timedelta(days=2)
            
            csv_data.append({
                "reservation_id": f"RES-{2024000 + i}",
                "guest_name": f"João Silva {i+1}",
                "room_number": f"{101 + i}",
                "check_in": check_in.strftime("%Y-%m-%d"),
                "check_out": check_out.strftime("%Y-%m-%d"),
                "room_revenue": f"{150.00 + (i * 10)}",
                "parking_revenue": "15.00" if i % 3 == 0 else "0.00",
                "vending_revenue": "8.50" if i % 4 == 0 else "0.00",
                "city_tax": "7.00",
                "status": "confirmed"
            })
        
        # Convert to CSV string
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=csv_data[0].keys())
        writer.writeheader()
        writer.writerows(csv_data)
        
        return output.getvalue()
    
    def test_csv_upload(self):
        """Test POST /api/upload/reservations"""
        try:
            # Create sample CSV
            csv_content = self.create_sample_csv()
            
            # Prepare file upload
            files = {
                'file': ('reservations.csv', csv_content, 'text/csv')
            }
            
            response = self.session.post(f"{self.base_url}/upload/reservations", files=files)
            
            if response.status_code != 200:
                self.log_test("CSV Upload", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            data = response.json()
            
            if not data.get("success"):
                self.log_test("CSV Upload", False, f"Upload failed: {data}")
                return False
            
            added = data.get("reservations_added", 0)
            updated = data.get("reservations_updated", 0)
            
            if added > 0 or updated > 0:
                self.log_test("CSV Upload", True, f"Processed: {added} added, {updated} updated")
                return True
            else:
                self.log_test("CSV Upload", False, f"No reservations processed: {data}")
                return False
                
        except Exception as e:
            self.log_test("CSV Upload", False, f"Error: {str(e)}")
            return False
    
    def test_dashboard_api(self):
        """Test GET /api/dashboard - comprehensive validation"""
        try:
            response = self.session.get(f"{self.base_url}/dashboard")
            
            if response.status_code != 200:
                self.log_test("Dashboard API", False, f"HTTP {response.status_code}: {response.text}")
                return False
            
            data = response.json()
            
            # Validate required top-level fields
            required_fields = ["status", "rhythm", "today", "radar", "week", "month", "alerts"]
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                self.log_test("Dashboard API", False, f"Missing fields: {missing_fields}")
                return False
            
            # Validate status values
            if data["status"] not in ["green", "yellow", "red"]:
                self.log_test("Dashboard API", False, f"Invalid status: {data['status']}")
                return False
            
            # Validate rhythm values
            if data["rhythm"] not in ["up", "stable", "down"]:
                self.log_test("Dashboard API", False, f"Invalid rhythm: {data['rhythm']}")
                return False
            
            # Validate today object
            today = data["today"]
            today_required = ["date", "rooms_occupied", "total_rooms", "occupancy_percent", 
                            "arrivals", "departures", "room_revenue", "parking_revenue", 
                            "vending_revenue", "city_tax", "adr"]
            
            today_missing = [field for field in today_required if field not in today]
            if today_missing:
                self.log_test("Dashboard API", False, f"Today missing fields: {today_missing}")
                return False
            
            # Validate radar array (should have 14 days)
            radar = data["radar"]
            if not isinstance(radar, list) or len(radar) != 14:
                self.log_test("Dashboard API", False, f"Radar should be 14-day array, got: {len(radar) if isinstance(radar, list) else type(radar)}")
                return False
            
            # Validate first radar entry structure
            radar_required = ["date", "day_name", "day_num", "month", "rooms_sold", 
                            "total_rooms", "occupancy_percent", "adr", "target", "urgency"]
            
            radar_missing = [field for field in radar_required if field not in radar[0]]
            if radar_missing:
                self.log_test("Dashboard API", False, f"Radar entry missing fields: {radar_missing}")
                return False
            
            # Validate week object
            week = data["week"]
            week_required = ["start", "end", "occupancy_avg", "revenue_total", "adr_avg", "trend"]
            week_missing = [field for field in week_required if field not in week]
            
            if week_missing:
                self.log_test("Dashboard API", False, f"Week missing fields: {week_missing}")
                return False
            
            # Validate month object
            month = data["month"]
            month_required = ["name", "occupancy_accumulated", "revenue_accumulated", 
                            "projected_occupancy", "days_elapsed", "days_total"]
            month_missing = [field for field in month_required if field not in month]
            
            if month_missing:
                self.log_test("Dashboard API", False, f"Month missing fields: {month_missing}")
                return False
            
            # Validate alerts
            alerts = data["alerts"]
            if not isinstance(alerts, list):
                self.log_test("Dashboard API", False, f"Alerts should be array, got: {type(alerts)}")
                return False
            
            # All validations passed
            occupancy = today["occupancy_percent"]
            revenue = today["room_revenue"]
            
            self.log_test("Dashboard API", True, 
                         f"Complete dashboard data: {data['status']} status, {occupancy}% occupancy, €{revenue:.2f} revenue, {len(radar)} radar days")
            return True
            
        except Exception as e:
            self.log_test("Dashboard API", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests in priority order"""
        print(f"🏨 Bad Hotel Noordwijk Backend API Testing")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test in priority order based on test_result.md
        tests = [
            ("API Connectivity", self.test_api_root),
            ("Settings API", self.test_settings_api),
            ("Seed Demo Data", self.test_seed_demo_data),
            ("CSV Upload", self.test_csv_upload),
            ("Dashboard API", self.test_dashboard_api),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n🧪 Testing {test_name}...")
            if test_func():
                passed += 1
        
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests PASSED!")
        else:
            print(f"⚠️  {total - passed} tests FAILED")
            
        return self.test_results

def main():
    """Main test execution"""
    tester = HotelAPITester()
    results = tester.run_all_tests()
    
    # Print detailed results
    print("\n📋 Detailed Results:")
    for test_name, result in results.items():
        status = "✅" if result["success"] else "❌"
        print(f"{status} {test_name}: {result['details']}")
    
    return results

if __name__ == "__main__":
    main()