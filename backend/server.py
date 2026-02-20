from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import csv
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class Reservation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reservation_id: str
    guest_name: str
    room_number: str
    check_in: datetime
    check_out: datetime
    room_revenue: float = 0.0
    parking_revenue: float = 0.0
    vending_revenue: float = 0.0
    city_tax: float = 0.0
    adr: float = 0.0  # Average Daily Rate
    status: str = "confirmed"  # confirmed, checked_in, checked_out, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DailyStats(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: datetime
    total_rooms: int = 24  # Default hotel rooms
    rooms_occupied: int = 0
    occupancy_percent: float = 0.0
    arrivals: int = 0
    departures: int = 0
    room_revenue: float = 0.0
    parking_revenue: float = 0.0
    vending_revenue: float = 0.0
    city_tax: float = 0.0
    adr: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class HotelSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    total_rooms: int = 24
    high_season_target: float = 85.0  # Target occupancy for high season (Apr-Sep)
    low_season_target: float = 65.0   # Target occupancy for low season (Oct-Mar)
    last_csv_upload: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DashboardResponse(BaseModel):
    status: str  # "green", "yellow", "red"
    rhythm: str  # "up", "stable", "down"
    last_update: Optional[datetime]
    today: Dict[str, Any]
    radar: List[Dict[str, Any]]
    week: Dict[str, Any]
    month: Dict[str, Any]
    alerts: List[str]

# ============== HELPER FUNCTIONS ==============

def is_high_season(date: datetime) -> bool:
    """High season: April to September"""
    return 4 <= date.month <= 9

def get_season_target(date: datetime, settings: dict) -> float:
    """Get occupancy target based on season"""
    if is_high_season(date):
        return settings.get('high_season_target', 85.0)
    return settings.get('low_season_target', 65.0)

def calculate_status(today_stats: dict, radar_stats: list, settings: dict) -> str:
    """
    Calculate hotel status based on aggressive logic:
    - Green: Occupancy D+7 and D+14 meet season targets
    - Yellow: One of D+7 or D+14 below target
    - Red: Both below target or significant issues
    """
    today = datetime.utcnow()
    d7_target = get_season_target(today + timedelta(days=7), settings)
    d14_target = get_season_target(today + timedelta(days=14), settings)
    
    # Get D+7 and D+14 occupancy from radar
    d7_occ = 0
    d14_occ = 0
    
    for stat in radar_stats:
        days_ahead = (stat.get('date', today) - today).days if isinstance(stat.get('date'), datetime) else 0
        if 6 <= days_ahead <= 8:
            d7_occ = stat.get('occupancy_percent', 0)
        if 13 <= days_ahead <= 15:
            d14_occ = stat.get('occupancy_percent', 0)
    
    # Status logic
    d7_ok = d7_occ >= d7_target * 0.9  # 90% of target is acceptable
    d14_ok = d14_occ >= d14_target * 0.8  # 80% of target for D+14
    
    if d7_ok and d14_ok:
        return "green"
    elif d7_ok or d14_ok:
        return "yellow"
    else:
        return "red"

def calculate_rhythm(current_week_revenue: float, previous_week_revenue: float) -> str:
    """Calculate rhythm based on week-over-week revenue comparison"""
    if previous_week_revenue == 0:
        return "stable"
    
    change = (current_week_revenue - previous_week_revenue) / previous_week_revenue
    
    if change > 0.05:
        return "up"
    elif change < -0.05:
        return "down"
    return "stable"

def generate_alerts(today_stats: dict, radar_stats: list, settings: dict) -> List[str]:
    """Generate attention alerts (max 3)"""
    alerts = []
    today = datetime.utcnow()
    
    # Check today's occupancy
    today_occ = today_stats.get('occupancy_percent', 0)
    today_target = get_season_target(today, settings)
    
    if today_occ < today_target * 0.7:
        alerts.append(f"Ocupação hoje ({today_occ:.0f}%) abaixo da meta ({today_target:.0f}%)")
    
    # Check next 7 days for low occupancy in high season
    low_days = []
    for stat in radar_stats[:7]:
        occ = stat.get('occupancy_percent', 0)
        target = get_season_target(stat.get('date', today), settings)
        if occ < target * 0.6 and is_high_season(stat.get('date', today)):
            low_days.append(stat.get('date', today))
    
    if len(low_days) >= 2:
        alerts.append(f"{len(low_days)} dias críticos nos próximos 7 dias")
    
    # Check for consecutive weak days
    consecutive_weak = 0
    for stat in radar_stats[:7]:
        if stat.get('occupancy_percent', 0) < 50:
            consecutive_weak += 1
        else:
            break
    
    if consecutive_weak >= 3:
        alerts.append(f"{consecutive_weak} dias consecutivos com ocupação baixa")
    
    return alerts[:3]  # Max 3 alerts

# ============== API ROUTES ==============

@api_router.get("/")
async def root():
    return {"message": "Bad Hotel Noordwijk API", "version": "1.0"}

@api_router.get("/settings")
async def get_settings():
    """Get hotel settings"""
    settings = await db.settings.find_one()
    if not settings:
        # Create default settings
        default_settings = HotelSettings()
        await db.settings.insert_one(default_settings.dict())
        return default_settings.dict()
    return settings

@api_router.put("/settings")
async def update_settings(total_rooms: int = 24, high_season_target: float = 85.0, low_season_target: float = 65.0):
    """Update hotel settings"""
    settings = await db.settings.find_one()
    if not settings:
        new_settings = HotelSettings(
            total_rooms=total_rooms,
            high_season_target=high_season_target,
            low_season_target=low_season_target
        )
        await db.settings.insert_one(new_settings.dict())
        return new_settings.dict()
    
    await db.settings.update_one(
        {"id": settings["id"]},
        {"$set": {
            "total_rooms": total_rooms,
            "high_season_target": high_season_target,
            "low_season_target": low_season_target
        }}
    )
    return await db.settings.find_one()

@api_router.post("/upload/reservations")
async def upload_reservations(file: UploadFile = File(...)):
    """
    Upload reservations CSV from Mews PMS.
    Expected columns: reservation_id, guest_name, room_number, check_in, check_out, 
                      room_revenue, parking_revenue, vending_revenue, city_tax, status
    """
    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        reservations_added = 0
        reservations_updated = 0
        
        for row in reader:
            try:
                # Parse dates - handle multiple formats
                check_in_str = row.get('check_in', row.get('Check-in', row.get('CheckIn', '')))
                check_out_str = row.get('check_out', row.get('Check-out', row.get('CheckOut', '')))
                
                # Try multiple date formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%dT%H:%M:%S']:
                    try:
                        check_in = datetime.strptime(check_in_str.strip(), fmt)
                        break
                    except:
                        continue
                else:
                    check_in = datetime.utcnow()
                
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%dT%H:%M:%S']:
                    try:
                        check_out = datetime.strptime(check_out_str.strip(), fmt)
                        break
                    except:
                        continue
                else:
                    check_out = datetime.utcnow() + timedelta(days=1)
                
                # Calculate nights and ADR
                nights = max(1, (check_out - check_in).days)
                room_revenue = float(row.get('room_revenue', row.get('Room Revenue', row.get('Revenue', 0))) or 0)
                adr = room_revenue / nights if nights > 0 else 0
                
                reservation_id = row.get('reservation_id', row.get('Reservation ID', row.get('ReservationId', str(uuid.uuid4()))))
                
                reservation = Reservation(
                    reservation_id=reservation_id,
                    guest_name=row.get('guest_name', row.get('Guest Name', row.get('GuestName', 'Unknown'))),
                    room_number=row.get('room_number', row.get('Room', row.get('RoomNumber', 'N/A'))),
                    check_in=check_in,
                    check_out=check_out,
                    room_revenue=room_revenue,
                    parking_revenue=float(row.get('parking_revenue', row.get('Parking', 0)) or 0),
                    vending_revenue=float(row.get('vending_revenue', row.get('Vending', 0)) or 0),
                    city_tax=float(row.get('city_tax', row.get('City Tax', row.get('Tax', 0))) or 0),
                    adr=adr,
                    status=row.get('status', row.get('Status', 'confirmed')).lower()
                )
                
                # Update or insert
                existing = await db.reservations.find_one({"reservation_id": reservation_id})
                if existing:
                    await db.reservations.update_one(
                        {"reservation_id": reservation_id},
                        {"$set": reservation.dict()}
                    )
                    reservations_updated += 1
                else:
                    await db.reservations.insert_one(reservation.dict())
                    reservations_added += 1
                    
            except Exception as e:
                logger.error(f"Error processing row: {row}, Error: {e}")
                continue
        
        # Update last upload timestamp
        await db.settings.update_one({}, {"$set": {"last_csv_upload": datetime.utcnow()}}, upsert=True)
        
        # Recalculate daily stats
        await recalculate_daily_stats()
        
        return {
            "success": True,
            "reservations_added": reservations_added,
            "reservations_updated": reservations_updated,
            "message": f"Processado com sucesso: {reservations_added} novas, {reservations_updated} atualizadas"
        }
        
    except Exception as e:
        logger.error(f"Error uploading reservations: {e}")
        raise HTTPException(status_code=400, detail=str(e))

async def recalculate_daily_stats():
    """Recalculate daily statistics from reservations"""
    settings = await db.settings.find_one() or {"total_rooms": 24}
    total_rooms = settings.get('total_rooms', 24)
    
    # Calculate stats for today and next 30 days
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    for day_offset in range(-7, 31):  # Past 7 days to next 30 days
        date = today + timedelta(days=day_offset)
        next_date = date + timedelta(days=1)
        
        # Find reservations active on this date
        active_reservations = await db.reservations.find({
            "check_in": {"$lte": date},
            "check_out": {"$gt": date},
            "status": {"$in": ["confirmed", "checked_in"]}
        }).to_list(1000)
        
        # Count arrivals (check-in on this date)
        arrivals = await db.reservations.count_documents({
            "check_in": {"$gte": date, "$lt": next_date},
            "status": {"$in": ["confirmed", "checked_in"]}
        })
        
        # Count departures (check-out on this date)
        departures = await db.reservations.count_documents({
            "check_out": {"$gte": date, "$lt": next_date},
            "status": {"$in": ["confirmed", "checked_in", "checked_out"]}
        })
        
        rooms_occupied = len(active_reservations)
        occupancy_percent = (rooms_occupied / total_rooms * 100) if total_rooms > 0 else 0
        
        # Calculate revenue for this date
        room_revenue = 0
        parking_revenue = 0
        vending_revenue = 0
        city_tax = 0
        
        for res in active_reservations:
            nights = max(1, (res['check_out'] - res['check_in']).days)
            room_revenue += res.get('room_revenue', 0) / nights
            parking_revenue += res.get('parking_revenue', 0) / nights
            vending_revenue += res.get('vending_revenue', 0) / nights
            city_tax += res.get('city_tax', 0) / nights
        
        adr = room_revenue / rooms_occupied if rooms_occupied > 0 else 0
        
        daily_stat = DailyStats(
            date=date,
            total_rooms=total_rooms,
            rooms_occupied=rooms_occupied,
            occupancy_percent=round(occupancy_percent, 1),
            arrivals=arrivals,
            departures=departures,
            room_revenue=round(room_revenue, 2),
            parking_revenue=round(parking_revenue, 2),
            vending_revenue=round(vending_revenue, 2),
            city_tax=round(city_tax, 2),
            adr=round(adr, 2)
        )
        
        # Upsert daily stats
        await db.daily_stats.update_one(
            {"date": {"$gte": date, "$lt": next_date}},
            {"$set": daily_stat.dict()},
            upsert=True
        )

@api_router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard():
    """Get complete dashboard data"""
    settings = await db.settings.find_one() or {"total_rooms": 24, "high_season_target": 85.0, "low_season_target": 65.0}
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get today's stats
    today_stats = await db.daily_stats.find_one({
        "date": {"$gte": today, "$lt": today + timedelta(days=1)}
    })
    
    if not today_stats:
        today_stats = {
            "date": today,
            "total_rooms": settings.get('total_rooms', 24),
            "rooms_occupied": 0,
            "occupancy_percent": 0,
            "arrivals": 0,
            "departures": 0,
            "room_revenue": 0,
            "parking_revenue": 0,
            "vending_revenue": 0,
            "city_tax": 0,
            "adr": 0
        }
    
    # Get radar (next 14 days)
    radar_stats = []
    for i in range(14):
        date = today + timedelta(days=i)
        stat = await db.daily_stats.find_one({
            "date": {"$gte": date, "$lt": date + timedelta(days=1)}
        })
        
        target = get_season_target(date, settings)
        
        if stat:
            radar_stats.append({
                "date": date,
                "day_name": date.strftime('%a'),
                "day_num": date.day,
                "month": date.strftime('%b'),
                "rooms_sold": stat.get('rooms_occupied', 0),
                "total_rooms": stat.get('total_rooms', 24),
                "occupancy_percent": stat.get('occupancy_percent', 0),
                "adr": stat.get('adr', 0),
                "target": target,
                "urgency": "high" if i <= 3 else "medium" if i <= 7 else "low"
            })
        else:
            radar_stats.append({
                "date": date,
                "day_name": date.strftime('%a'),
                "day_num": date.day,
                "month": date.strftime('%b'),
                "rooms_sold": 0,
                "total_rooms": settings.get('total_rooms', 24),
                "occupancy_percent": 0,
                "adr": 0,
                "target": target,
                "urgency": "high" if i <= 3 else "medium" if i <= 7 else "low"
            })
    
    # Calculate week stats (current week Mon-Sun)
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=7)
    
    week_stats = await db.daily_stats.find({
        "date": {"$gte": week_start, "$lt": week_end}
    }).to_list(7)
    
    week_occupancy = sum(s.get('occupancy_percent', 0) for s in week_stats) / max(len(week_stats), 1)
    week_revenue = sum(s.get('room_revenue', 0) + s.get('parking_revenue', 0) + s.get('vending_revenue', 0) for s in week_stats)
    week_adr = sum(s.get('adr', 0) for s in week_stats) / max(len([s for s in week_stats if s.get('adr', 0) > 0]), 1)
    
    # Previous week for comparison
    prev_week_start = week_start - timedelta(days=7)
    prev_week_end = week_start
    
    prev_week_stats = await db.daily_stats.find({
        "date": {"$gte": prev_week_start, "$lt": prev_week_end}
    }).to_list(7)
    
    prev_week_revenue = sum(s.get('room_revenue', 0) + s.get('parking_revenue', 0) + s.get('vending_revenue', 0) for s in prev_week_stats)
    prev_week_occupancy = sum(s.get('occupancy_percent', 0) for s in prev_week_stats) / max(len(prev_week_stats), 1)
    
    # Trend calculation
    if prev_week_occupancy > 0:
        if week_occupancy > prev_week_occupancy * 1.05:
            week_trend = "up"
        elif week_occupancy < prev_week_occupancy * 0.95:
            week_trend = "down"
        else:
            week_trend = "stable"
    else:
        week_trend = "stable"
    
    # Calculate month stats
    month_start = today.replace(day=1)
    if today.month == 12:
        month_end = today.replace(year=today.year + 1, month=1, day=1)
    else:
        month_end = today.replace(month=today.month + 1, day=1)
    
    month_stats = await db.daily_stats.find({
        "date": {"$gte": month_start, "$lt": month_end}
    }).to_list(31)
    
    days_in_month = (month_end - month_start).days
    days_elapsed = (today - month_start).days + 1
    
    month_occupancy = sum(s.get('occupancy_percent', 0) for s in month_stats) / max(len(month_stats), 1)
    month_revenue = sum(s.get('room_revenue', 0) + s.get('parking_revenue', 0) + s.get('vending_revenue', 0) for s in month_stats)
    
    # Project month occupancy based on current rhythm
    if days_elapsed > 0 and days_elapsed < days_in_month:
        projected_occupancy = month_occupancy  # Already an average
    else:
        projected_occupancy = month_occupancy
    
    # Calculate status and rhythm
    status = calculate_status(today_stats, radar_stats, settings)
    rhythm = calculate_rhythm(week_revenue, prev_week_revenue)
    alerts = generate_alerts(today_stats, radar_stats, settings)
    
    return DashboardResponse(
        status=status,
        rhythm=rhythm,
        last_update=settings.get('last_csv_upload'),
        today={
            "date": today.isoformat(),
            "rooms_occupied": today_stats.get('rooms_occupied', 0),
            "total_rooms": today_stats.get('total_rooms', 24),
            "occupancy_percent": today_stats.get('occupancy_percent', 0),
            "arrivals": today_stats.get('arrivals', 0),
            "departures": today_stats.get('departures', 0),
            "room_revenue": today_stats.get('room_revenue', 0),
            "parking_revenue": today_stats.get('parking_revenue', 0),
            "vending_revenue": today_stats.get('vending_revenue', 0),
            "city_tax": today_stats.get('city_tax', 0),
            "adr": today_stats.get('adr', 0)
        },
        radar=radar_stats,
        week={
            "start": week_start.isoformat(),
            "end": week_end.isoformat(),
            "occupancy_avg": round(week_occupancy, 1),
            "revenue_total": round(week_revenue, 2),
            "adr_avg": round(week_adr, 2),
            "trend": week_trend
        },
        month={
            "name": today.strftime('%B'),
            "occupancy_accumulated": round(month_occupancy, 1),
            "revenue_accumulated": round(month_revenue, 2),
            "projected_occupancy": round(projected_occupancy, 1),
            "days_elapsed": days_elapsed,
            "days_total": days_in_month
        },
        alerts=alerts if alerts else ["Nenhum ponto crítico identificado no momento."]
    )

@api_router.post("/seed-demo-data")
async def seed_demo_data():
    """Seed demo data for testing"""
    try:
        # Clear existing data
        await db.reservations.delete_many({})
        await db.daily_stats.delete_many({})
        
        settings = await db.settings.find_one() or {"total_rooms": 24}
        total_rooms = settings.get('total_rooms', 24)
        
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Generate reservations for past 7 days and next 30 days
        import random
        reservations_created = 0
        
        for day_offset in range(-7, 31):
            date = today + timedelta(days=day_offset)
            
            # Vary occupancy - higher on weekends, lower mid-week
            day_of_week = date.weekday()
            base_occupancy = 0.85 if day_of_week >= 4 else 0.65  # Fri-Sun vs Mon-Thu
            
            # Add some randomness
            occupancy = base_occupancy + random.uniform(-0.15, 0.15)
            occupancy = max(0.4, min(0.95, occupancy))
            
            rooms_to_fill = int(total_rooms * occupancy)
            
            for room_num in range(1, rooms_to_fill + 1):
                # Random stay length 1-4 nights
                nights = random.randint(1, 4)
                
                # Check if reservation already covers this date
                existing = await db.reservations.find_one({
                    "room_number": str(room_num),
                    "check_in": {"$lte": date},
                    "check_out": {"$gt": date}
                })
                
                if not existing:
                    room_revenue = random.uniform(120, 280) * nights
                    
                    reservation = Reservation(
                        reservation_id=f"DEMO-{date.strftime('%Y%m%d')}-{room_num}",
                        guest_name=f"Guest {room_num}",
                        room_number=str(room_num),
                        check_in=date,
                        check_out=date + timedelta(days=nights),
                        room_revenue=round(room_revenue, 2),
                        parking_revenue=round(random.uniform(0, 25) * nights, 2) if random.random() > 0.5 else 0,
                        vending_revenue=round(random.uniform(0, 15) * nights, 2) if random.random() > 0.7 else 0,
                        city_tax=round(nights * 3.5, 2),
                        adr=round(room_revenue / nights, 2),
                        status="checked_out" if day_offset < 0 else "confirmed"
                    )
                    await db.reservations.insert_one(reservation.dict())
                    reservations_created += 1
        
        # Update last upload timestamp
        await db.settings.update_one({}, {"$set": {"last_csv_upload": datetime.utcnow()}}, upsert=True)
        
        # Recalculate daily stats
        await recalculate_daily_stats()
        
        return {
            "success": True,
            "reservations_created": reservations_created,
            "message": "Dados de demonstração criados com sucesso"
        }
        
    except Exception as e:
        logger.error(f"Error seeding demo data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
