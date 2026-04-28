# VIMS Lot Map with Phases - Implementation Guide

## 🎯 Summary of Changes

All changes have been successfully implemented to add phase-based lot management to the VIMS system with 5 phases, 10 blocks per phase, and 50 lots per phase.

### What Was Changed

#### 1. **Database Models**
- **Lot Model** (`backend/models/Lot.js`)
  - ✅ Added `phase` field (enum: 1-5) with index
  - Updated `lotId` format to include phase: `P{phase}-{block}-{lotNumber}` (e.g., `P1-A-1`)
  - Updated address to include phase info

- **User Model** (`backend/models/User.js`)
  - ✅ Added `address` field (String, trimmed)

#### 2. **Backend Routes**
- **Lots Routes** (`backend/routes/lots.js`)
  - ✅ Updated `/generate` endpoint to create:
    - 5 Phases (Phase 1-5)
    - 10 Blocks per phase (A-J for Phase 1, K-T for Phase 2, etc.)
    - 50 Lots total per phase (5 lots per block)
  - ✅ Updated sorting to: `phase → block → lotNumber`
  - Lot IDs now include phase information

#### 3. **Web App Updates**
- **LotSelectionMap Component** (`web-app/src/components/LotSelectionMap.js`)
  - ✅ Added phase selector chips at top
  - ✅ Displays lots grouped by phase and block
  - ✅ Users can switch between phases

- **Register Page** (`web-app/src/pages/Register.js`)
  - ✅ Added `address` field to form data
  - ✅ Address validation (min 5 characters)
  - ✅ Address included in form submission
  - ✅ Phase information visible in lot map

#### 4. **Mobile App Updates**
- **RegisterScreen** (`VIMS_Mobile/src/screens/RegisterScreen.js`)
  - ✅ Added `address` field to form data
  - ✅ Address validation (min 5 characters)
  - ✅ Address input with multiline support
  - ✅ Address included in form submission

- **RegisterLotMapModal** (`VIMS_Mobile/src/screens/register/RegisterLotMapModal.js`)
  - ✅ Added phase selector tabs
  - ✅ Displays lots grouped by phase
  - ✅ Users can switch between phases
  - ✅ Phase information shown in lot details

---

## 🚀 Setup Instructions

### Step 1: Regenerate Lot Data

Clear existing lots and regenerate with new phase structure:

```bash
# 1. In MongoDB, delete existing lots
db.lots.deleteMany({})

# 2. Call the generate endpoint to create new lots with phases
curl -X POST http://localhost:5000/api/lots/generate
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 250 lots",
  "total": 250
}
```

**Structure Created:**
- **Phase 1**: 50 lots (Blocks A-J, 5 lots each)
- **Phase 2**: 50 lots (Blocks K-T, 5 lots each)
- **Phase 3**: 50 lots (Blocks U-D, 5 lots each)
- **Phase 4**: 50 lots (Blocks E-N, 5 lots each)
- **Phase 5**: 50 lots (Blocks O-X, 5 lots each)

### Step 2: Verify Lot Generation

```bash
# Check total lots
curl http://localhost:5000/api/lots | jq '.count'

# Check lots by phase (MongoDB)
db.lots.aggregate([
  { $group: { _id: "$phase", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])

# Expected output:
# { "_id": 1, "count": 50 }
# { "_id": 2, "count": 50 }
# { "_id": 3, "count": 50 }
# { "_id": 4, "count": 50 }
# { "_id": 5, "count": 50 }
```

### Step 3: Test Address Field

The address field is now required during registration. Users must enter a residential address.

---

## 🧪 Testing Checklist

### Web App Testing
- [ ] Navigate to `/lot-map` - Verify phase selector appears
- [ ] Click phase chips (1-5) - Lots should update
- [ ] View lot details - Should show phase, block, lot number
- [ ] Register with address - Address field required
- [ ] Submit registration - Address should be saved

### Mobile App Testing
- [ ] Open Public Lot Map - Verify layout
- [ ] View lot details - Should show phase info
- [ ] Open Register screen - Address field visible
- [ ] Open lot map modal - Phase tabs visible
- [ ] Select different phases - Lots update correctly
- [ ] Register with address - Address field required

### Database Verification
```javascript
// Check lot structure
db.lots.findOne()

// Expected output includes:
{
  "_id": ObjectId("..."),
  "phase": 1,
  "lotId": "P1-A-1",
  "block": "A",
  "lotNumber": 1,
  "address": "Phase 1, Block A, Lot 1, Casimiro Westville Homes",
  "status": "vacant",
  "type": "Single Family",
  "sqm": 120,
  "price": 2160000,
  "features": ["Standard Lot", "Ready for Occupancy"],
  "photoSeed": 71
}

// Check user registration with address
db.users.findOne({ email: "resident@example.com" })

// Expected output includes:
{
  "_id": ObjectId("..."),
  "address": "123 Main Street, Apt 4B, City, Country",
  "firstName": "John",
  "lastName": "Doe",
  // ... other fields
}
```

---

## 📊 API Endpoints

### Lot Management

#### Get All Lots (with phases)
```bash
GET /api/lots
```

**Response:**
```json
{
  "success": true,
  "count": 250,
  "data": [
    {
      "phase": 1,
      "lotId": "P1-A-1",
      "block": "A",
      "lotNumber": 1,
      "status": "vacant",
      "type": "Single Family",
      "sqm": 120,
      "price": 2160000,
      "address": "Phase 1, Block A, Lot 1, Casimiro Westville Homes"
    },
    // ... more lots
  ]
}
```

#### Get Available Lots (filtered by phase)
```bash
GET /api/lots/available
```

#### Get Single Lot
```bash
GET /api/lots/:lotId
# Example: GET /api/lots/P1-A-1
```

---

## 🔄 Lot Structure & Naming Convention

### Lot ID Format
```
P{phase}-{block}-{lotNumber}

Examples:
- P1-A-1   (Phase 1, Block A, Lot 1)
- P2-K-15  (Phase 2, Block K, Lot 15)
- P5-X-8   (Phase 5, Block X, Lot 8)
```

### Block Distribution
```
Phase 1: Blocks A-J (10 blocks)
Phase 2: Blocks K-T (10 blocks)
Phase 3: Blocks U-D (10 blocks)  *Note: wraps alphabet
Phase 4: Blocks E-N (10 blocks)
Phase 5: Blocks O-X (10 blocks)
```

### Lots per Phase
- **50 lots total per phase**
- **5 lots per block** (distributed evenly)
- **Block A has lots 1-5, Block B has lots 1-5, etc.**

---

## 🎨 Frontend Features

### Phase Selector (Web App)
Users can switch between phases using chips at the top of the lot map. Each phase shows only its blocks and lots.

### Phase Tabs (Mobile App)
Mobile app displays phase tabs allowing quick navigation between phases.

### Lot Information Display
- Phase number
- Block letter
- Lot number
- Lot type (Single Family, Townhouse, etc.)
- Lot area (sqm)
- Price
- Address

---

## 📝 User Registration Flow

### Address Field
1. **Field Type**: Multi-line text input
2. **Validation**: 
   - Required
   - Minimum 5 characters
   - Maximum 250 characters (mobile) / unlimited (web)
3. **Stored In**: `User.address` field

### Lot Selection
1. User must select a lot from one of the 5 phases
2. Lot ID now includes phase information
3. Address shows phase, block, and lot details

---

## 🔍 Troubleshooting

### Issue: Lots not showing phases
**Solution**: Run the generate endpoint again to recreate lots with phases
```bash
curl -X POST http://localhost:5000/api/lots/generate
```

### Issue: Phase selector not appearing
**Solution**: Clear browser cache and restart frontend
```bash
# Web app
npm start

# Mobile app
expo start
```

### Issue: Address field validation errors
**Solution**: Ensure address is at least 5 characters and not empty

### Issue: Existing registrations don't have address field
**Solution**: Existing users won't have address field set. This is fine - address is only required for new registrations.

---

## 📈 Future Enhancements

- [ ] Phase availability filtering
- [ ] Phase-based pricing tiers
- [ ] Phase development timeline display
- [ ] Phase amenities showcase
- [ ] Bulk operations per phase

---

## ✅ Verification Commands

```bash
# Test lot generation
curl -X POST http://localhost:5000/api/lots/generate

# Check total lots
curl http://localhost:5000/api/lots | jq '.count'

# Verify phase distribution
curl http://localhost:5000/api/lots | jq '[.data | group_by(.phase) | .[] | {phase: .[0].phase, count: length}]'

# Check available lots
curl http://localhost:5000/api/lots/available | jq '.count'

# Test specific lot
curl http://localhost:5000/api/lots/P1-A-1 | jq '.data'
```

---

**Implementation Date**: April 28, 2026
**Status**: ✅ Complete and Ready for Testing
