import React, { useState } from 'react';
import { Box, Button, Container, Grid, Paper, TextField, Typography } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const emptyVehicle = { plateNumber: '', make: '', model: '', color: '' };
const emptyFamilyMember = { name: '', relationship: '', age: '', phone: '' };

const FirstLoginSetup = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([emptyVehicle]);
  const [familyMembers, setFamilyMembers] = useState([emptyFamilyMember]);

  const updateVehicle = (idx, key, value) => {
    setVehicles((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: value } : v)));
  };

  const updateFamilyMember = (idx, key, value) => {
    setFamilyMembers((prev) => prev.map((m, i) => (i === idx ? { ...m, [key]: value } : m)));
  };

  const addVehicle = () => setVehicles((prev) => [...prev, emptyVehicle]);
  const addFamilyMember = () => setFamilyMembers((prev) => [...prev, emptyFamilyMember]);
  const removeVehicle = (idx) => setVehicles((prev) => prev.filter((_, i) => i !== idx));
  const removeFamilyMember = (idx) => setFamilyMembers((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const cleanedVehicles = vehicles.filter(
        (v) => v.plateNumber || v.make || v.model || v.color
      );
      const cleanedFamily = familyMembers.filter(
        (m) => m.name || m.relationship || m.age || m.phone
      );

      const response = await axios.put('/api/users/profile', {
        vehicles: cleanedVehicles,
        familyMembers: cleanedFamily
      });

      if (response.data?.success) {
        const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...existingUser,
          vehicles: response.data.data?.vehicles || cleanedVehicles,
          familyMembers: response.data.data?.familyMembers || cleanedFamily,
          profileComplete: true
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        toast.success('Profile setup complete');
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete profile setup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 700 }}>
          First Login Setup
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
          Add your vehicles and family members to complete your resident profile.
        </Typography>

        <Box component="form" onSubmit={handleSubmit}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Vehicles
          </Typography>
          {vehicles.map((vehicle, idx) => (
            <Grid container spacing={2} key={`vehicle-${idx}`} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Plate Number"
                  value={vehicle.plateNumber}
                  onChange={(e) => updateVehicle(idx, 'plateNumber', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Make"
                  value={vehicle.make}
                  onChange={(e) => updateVehicle(idx, 'make', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Model"
                  value={vehicle.model}
                  onChange={(e) => updateVehicle(idx, 'model', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Color"
                  value={vehicle.color}
                  onChange={(e) => updateVehicle(idx, 'color', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={1}>
                <Button onClick={() => removeVehicle(idx)} disabled={vehicles.length === 1}>
                  -
                </Button>
              </Grid>
            </Grid>
          ))}
          <Button onClick={addVehicle} sx={{ mb: 3 }}>
            Add Vehicle
          </Button>

          <Typography variant="h6" sx={{ mb: 2 }}>
            Family Members
          </Typography>
          {familyMembers.map((member, idx) => (
            <Grid container spacing={2} key={`family-${idx}`} sx={{ mb: 1 }}>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Name"
                  value={member.name}
                  onChange={(e) => updateFamilyMember(idx, 'name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Relationship"
                  value={member.relationship}
                  onChange={(e) => updateFamilyMember(idx, 'relationship', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  label="Age"
                  type="number"
                  value={member.age}
                  onChange={(e) => updateFamilyMember(idx, 'age', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={member.phone}
                  onChange={(e) => updateFamilyMember(idx, 'phone', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={1}>
                <Button onClick={() => removeFamilyMember(idx)} disabled={familyMembers.length === 1}>
                  -
                </Button>
              </Grid>
            </Grid>
          ))}
          <Button onClick={addFamilyMember} sx={{ mb: 3 }}>
            Add Family Member
          </Button>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="contained" type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Complete Setup'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default FirstLoginSetup;
