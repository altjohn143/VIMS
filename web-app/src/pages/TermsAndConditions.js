import React from 'react';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

const sections = [
  ['Use of VIMS', 'VIMS is provided for Westville Casimiro Homes residents and authorized community personnel. Use your account only for lawful community services, requests, reservations, visitor management, payments, and related administration.'],
  ['Account responsibility', 'Keep your password and account access secure. Information submitted during registration must be accurate and current. Do not share an account or use VIMS to impersonate another person.'],
  ['Community rules', 'Use of VIMS does not replace HOA rules, notices, payment obligations, reservation requirements, or decisions of authorized community administrators. Residents must follow the applicable community policies.'],
  ['Acceptable use', 'Do not interfere with VIMS, attempt unauthorized access, upload harmful or misleading content, or use the service to harass, threaten, or violate another person’s rights.'],
  ['Verification and administration', 'The community may review registration and supporting documents to verify residency and administer services. Access may be restricted, suspended, or removed when necessary to protect the community or address misuse.'],
  ['Privacy', 'Personal information is handled under the VIMS Privacy Policy and applicable Philippine data privacy law. Your privacy consent is collected separately during registration.'],
  ['Changes and questions', 'The community may update these Terms when operational, legal, or security requirements change. Continued use after an update means you accept the updated Terms. For questions, contact the Westville Casimiro Homes administration.']
];

export default function TermsAndConditions() {
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 4, md: 8 }, bgcolor: '#f3f8f2' }}>
      <Container maxWidth="md">
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: 3 }} elevation={1}>
          <Typography variant="overline" color="primary" fontWeight={700}>VIMS</Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>Terms and Conditions</Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>Effective date: September 30, 2026</Typography>
          <Typography sx={{ mb: 3 }}>These Terms govern your use of the Village Information Management System (VIMS) for Westville Casimiro Homes.</Typography>
          {sections.map(([title, content]) => (
            <Box key={title} sx={{ mb: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>{title}</Typography>
              <Typography color="text.secondary">{content}</Typography>
            </Box>
          ))}
          <Button component={RouterLink} to="/register" variant="contained" sx={{ mt: 2 }}>Back to registration</Button>
        </Paper>
      </Container>
    </Box>
  );
}
