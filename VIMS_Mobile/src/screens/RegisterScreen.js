// src/screens/RegisterScreen.js
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { themeColors, shadows } from '../utils/theme';
import api from '../utils/api';
import { COUNTRY_CODES } from './RegisterScreen.constants';
import { styles } from './RegisterScreen.styles';
import RegisterLotMapModal from './register/RegisterLotMapModal';

const ID_DOCUMENT_TYPE_OPTIONS = [
  { value: 'national_id', label: 'National ID' },
  { value: 'sss', label: 'SSS ID' },
  { value: 'gsis', label: 'GSIS ID' },
  { value: 'umid', label: 'UMID' },
  { value: 'passport', label: 'Passport' },
  { value: 'driver_license', label: 'Driver\'s License' },
  { value: 'prc', label: 'PRC ID' },
  { value: 'voters', label: 'Voter\'s ID' },
  { value: 'nbi', label: 'NBI Clearance' },
  { value: 'owwa', label: 'OWWA ID' },
  { value: 'philhealth', label: 'PhilHealth ID' },
  { value: 'tin', label: 'TIN ID' },
  { value: 'pagibig', label: 'Pag-Ibig ID' },
  { value: 'afp', label: 'AFP ID' },
  { value: 'pnp', label: 'PNP ID' }
];

const RegisterScreen = ({ navigation, route }) => {
  const { updateUser } = useAuth();
  const WebDateInput = Platform.OS === 'web'
    ? ({ value, onChange }) =>
        React.createElement('input', {
          type: 'date',
          value,
          onChange: (e) => onChange?.(e?.target?.value || ''),
          style: {
            width: '100%',
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${themeColors.border}`,
            backgroundColor: '#f8fafc',
            fontSize: 14,
            boxSizing: 'border-box',
          },
        })
    : null;

  const safeGoToLogin = useCallback(() => {
    const names = navigation?.getState?.()?.routeNames || [];
    if (names.includes('Login')) {
      navigation.navigate('Login');
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    // Last resort: do nothing (prevents "action not handled" warning)
  }, [navigation]);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    email: '',
    phone: '',
    countryCode: '+63',
    password: '',
    confirmPassword: '',
    address: '',
    selectedLot: '',
    documentType: 'national_id',
    noVehicles: false,
    soloResident: false,
    vehicles: [{ plateNumber: '', make: '', model: '', color: '', carImage: null }],
    familyMembers: [{ name: '', relationship: '', age: '', phone: '' }],
  });

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [availableLots, setAvailableLots] = useState([]);
  const [allLots, setAllLots] = useState([]);
  const [selectedLotDetails, setSelectedLotDetails] = useState(null);
  const [loadingLots, setLoadingLots] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState({ email: null, phone: null });
  const [checkingAvailability, setCheckingAvailability] = useState({ email: false, phone: false });
  const [showMapModal, setShowMapModal] = useState(false);
  const [showLotDropdown, setShowLotDropdown] = useState(false);
  const [showCountryCodeDropdown, setShowCountryCodeDropdown] = useState(false);

  // OCR (backend-based)
  const [idDocs, setIdDocs] = useState({ frontUri: null, backUri: null });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrUnavailable, setOcrUnavailable] = useState(false);
  const [lastOcrSignature, setLastOcrSignature] = useState('');
  const [lastOcrAt, setLastOcrAt] = useState(0);
  const [ocrIdNumber, setOcrIdNumber] = useState('');
  const [registrationMode, setRegistrationMode] = useState(null);
  const [showIdUploadStep, setShowIdUploadStep] = useState(false);
  const [ocrStepCompleted, setOcrStepCompleted] = useState(false);

  // DOB picker
  const [dobPickerOpen, setDobPickerOpen] = useState(false);
  const [dobTemp, setDobTemp] = useState(null);

  useEffect(() => {
    fetchLots(); 
  }, []);

  useEffect(() => {
    if (route.params?.lot && route.params?.block && availableLots.length > 0) {
      const lotId = `${route.params.block}-${route.params.lot}`;
      const preSelectedLot = availableLots.find(l => l.lotId === lotId);
      if (preSelectedLot) {
        setFormData(prev => ({ ...prev, selectedLot: lotId, address: preSelectedLot.address }));
        setSelectedLotDetails(preSelectedLot);
      }
    }
  }, [route.params, availableLots]);

  const fetchLots = async () => {
    try {
      setLoadingLots(true);
      setLoadError(null);
      const response = await api.get('/lots');
      
      if (response.data.success) {
        const allLotsData = response.data.data;
        setAllLots(allLotsData);
        const vacantLots = allLotsData.filter(lot => lot.status === 'vacant');
        setAvailableLots(vacantLots);
        
        if (vacantLots.length === 0) {
          setLoadError('No vacant lots available. Please contact admin.');
        }
      } else {
        setLoadError('Failed to load lots data');
      }
    } catch (error) {
      setLoadError(error.response?.data?.error || 'Failed to connect to server');
      Alert.alert('Connection Error', `Cannot load lots. Make sure backend is running.`);
    } finally {
      setLoadingLots(false);
    }
  };

  const handleChange = (field, value) => {
    let filteredValue = value;
    
    if (field === 'firstName' || field === 'lastName' || field === 'middleName') {
      filteredValue = value.replace(/[^a-zA-Z\s-]/g, '');
    } else if (field === 'phone') {
      filteredValue = value.replace(/\D/g, '').slice(0, 10);
    } else if (field === 'countryCode') {
      filteredValue = value;
    } else if (field === 'dateOfBirth') {
      // allow yyyy-mm-dd only, partial typing ok
      filteredValue = value.replace(/[^\d-]/g, '').slice(0, 10);
    }

    setFormData(prev => ({ ...prev, [field]: filteredValue }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'selectedLot') {
      const selected = availableLots.find(lot => lot.lotId === filteredValue);
      setSelectedLotDetails(selected || null);
      // Auto-populate address from selected lot
      if (selected) {
        setFormData(prev => ({ ...prev, address: selected.address }));
      }
    }
  };

  const handleArrayFieldChange = (section, index, key, value) => {
    setFormData(prev => {
      const items = [...prev[section]];
      items[index] = { ...items[index], [key]: value };
      return { ...prev, [section]: items };
    });
  };

  const addVehicle = () => {
    setFormData(prev => ({
      ...prev,
      noVehicles: false,
      vehicles: [...(prev.vehicles || []), { plateNumber: '', make: '', model: '', color: '', carImage: null }]
    }));
  };

  const removeVehicle = (index) => {
    setFormData(prev => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index)
    }));
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      soloResident: false,
      familyMembers: [...(prev.familyMembers || []), { name: '', relationship: '', age: '', phone: '' }]
    }));
  };

  const removeFamilyMember = (index) => {
    setFormData(prev => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((_, i) => i !== index)
    }));
  };

  const toggleNoVehicles = () => {
    setFormData(prev => ({
      ...prev,
      noVehicles: !prev.noVehicles,
      vehicles: prev.noVehicles ? [{ plateNumber: '', make: '', model: '', color: '' }] : []
    }));
  };

  const toggleSoloResident = () => {
    setFormData(prev => ({
      ...prev,
      soloResident: !prev.soloResident,
      familyMembers: prev.soloResident ? [{ name: '', relationship: '', age: '', phone: '' }] : []
    }));
  };

  const handleLotSelect = (lot) => {
    if (lot.status === 'vacant') {
      setFormData(prev => ({ ...prev, selectedLot: lot.lotId, address: lot.address }));
      setSelectedLotDetails(lot);
      setShowLotDropdown(false);
      setShowMapModal(false);
      Alert.alert('Lot Selected', `You selected Lot ${lot.lotId} (${lot.sqm} sqm, ${lot.type})`);
    } else {
      Alert.alert('Not Available', `Lot ${lot.lotId} is not available for registration.`);
    }
  };

  const getSelectedCountry = () => {
    return COUNTRY_CODES.find(c => c.code === formData.countryCode) || COUNTRY_CODES[0];
  };

  const formatYyyyMmDd = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const openDobPicker = useCallback(() => {
    const existing = String(formData.dateOfBirth || '').trim();
    let start = new Date();
    if (/^\d{4}-\d{2}-\d{2}$/.test(existing)) {
      const d = new Date(existing + 'T00:00:00');
      if (!Number.isNaN(d.getTime())) start = d;
    } else {
      start = new Date();
      start.setFullYear(start.getFullYear() - 25);
    }
    setDobTemp(start);
    setDobPickerOpen(true);
  }, [formData.dateOfBirth]);

  const pickIdImage = useCallback(async (side) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to upload your ID.');
        return;
      }
      const imagesMediaTypes =
        ImagePicker?.MediaType?.Images
          ? [ImagePicker.MediaType.Images]
          : ImagePicker.MediaTypeOptions.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        // expo-image-picker expects a MediaType or array; array is the most compatible.
        mediaTypes: imagesMediaTypes,
        quality: 1,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri || null;
      if (!uri) return;
      setIdDocs((p) => ({
        ...p,
        ...(side === 'front' ? { frontUri: uri } : { backUri: uri }),
      }));
      // reset OCR availability whenever images change
      setOcrUnavailable(false);
      setLastOcrSignature('');
      setLastOcrAt(0);
      setOcrIdNumber('');
    } catch (e) {
      console.error('pickIdImage error:', e);
      Alert.alert('Error', e?.message || 'Failed to pick image.');
    }
  }, []);

  const pickCarImage = useCallback(async (vehicleIndex) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow photo access to upload your car image.');
        return;
      }
      const imagesMediaTypes =
        ImagePicker?.MediaType?.Images
          ? [ImagePicker.MediaType.Images]
          : ImagePicker.MediaTypeOptions.Images;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: imagesMediaTypes,
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri || null;
      if (!uri) return;
      setFormData(prev => {
        const vehicles = [...prev.vehicles];
        vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], carImage: uri };
        return { ...prev, vehicles };
      });
      Alert.alert('Photo Selected', 'Car photo selected successfully!');
    } catch (e) {
      console.error('pickCarImage error:', e);
      Alert.alert('Error', e?.message || 'Failed to pick car image.');
    }
  }, []);

  const takeCarPhoto = useCallback(async (vehicleIndex) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow camera access to take your car photo.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });
      if (result.canceled) return;
      const uri = result.assets?.[0]?.uri || null;
      if (!uri) return;
      setFormData(prev => {
        const vehicles = [...prev.vehicles];
        vehicles[vehicleIndex] = { ...vehicles[vehicleIndex], carImage: uri };
        return { ...prev, vehicles };
      });
      Alert.alert('Photo Taken', 'Car photo captured successfully!');
    } catch (e) {
      console.error('takeCarPhoto error:', e);
      Alert.alert('Error', e?.message || 'Failed to take car photo.');
    }
  }, []);

  const tryOcrAutofill = useCallback(async () => {
    if (registrationMode !== 'ocr') return;
    if (ocrLoading || ocrUnavailable) return;
    const { frontUri, backUri } = idDocs;
    if (!frontUri || !backUri) {
      Alert.alert('Missing images', 'Please select both front and back ID images first.');
      return;
    }

    const signature = `${frontUri}|${backUri}`;
    const now = Date.now();
    if (signature === lastOcrSignature) return;
    if (now - lastOcrAt < 8000) return;

    setOcrLoading(true);
    setLastOcrSignature(signature);
    setLastOcrAt(now);

    try {
      const fd = new FormData();
      if (Platform.OS === 'web') {
        const frontBlob = await fetch(frontUri).then((r) => r.blob());
        const backBlob = await fetch(backUri).then((r) => r.blob());
        fd.append('frontImage', frontBlob, 'front.jpg');
        fd.append('backImage', backBlob, 'back.jpg');
      } else {
        const ensureFileUriAsync = async (uri, name) => {
          const u = String(uri || '');
          // On Android, ImagePicker commonly returns content:// URIs which are
          // not reliably uploadable via Axios multipart. Copy to cache to get file://.
          if (Platform.OS === 'android' && u.startsWith('content://')) {
            const ext = u.toLowerCase().includes('.png') ? 'png' : 'jpg';
            const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
            const safeBase = name.replace(/\.[^.]+$/, '');
            const dest = `${baseDir}${safeBase}_${Date.now()}.${ext}`;
            await FileSystem.copyAsync({ from: u, to: dest });
            return dest;
          }
          return u;
        };

        const mkFileAsync = async (uri, name) => {
          const fileUri = await ensureFileUriAsync(uri, name);
          const lower = String(fileUri).toLowerCase();
          const type = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
          return { uri: fileUri, name, type };
        };

        fd.append('frontImage', await mkFileAsync(frontUri, 'front.jpg'));
        fd.append('backImage', await mkFileAsync(backUri, 'back.jpg'));
      }
      fd.append('documentType', formData.documentType || 'national_id');

      // RN note: Axios multipart uploads can fail with "Network Error" even when the
      // server is reachable. Use fetch for this endpoint to reliably send FormData.
      const url = `${api.defaults.baseURL}/verifications/ocr-id`;
      const r = await fetch(url, {
        method: 'POST',
        body: fd,
        headers: {
          Accept: 'application/json',
        },
      });
      const data = await r.json().catch(() => null);

      if (r.ok && data?.success) {
        const ocr = data.data || {};
        setFormData((prev) => ({
          ...prev,
          firstName: prev.firstName?.trim() ? prev.firstName : (ocr.firstName || prev.firstName),
          lastName: prev.lastName?.trim() ? prev.lastName : (ocr.lastName || prev.lastName),
          middleName: prev.middleName?.trim() ? prev.middleName : (ocr.middleName || prev.middleName),
          dateOfBirth: prev.dateOfBirth?.trim()
            ? prev.dateOfBirth
            : (/^\d{4}-\d{2}-\d{2}$/.test(String(ocr.dob || '')) ? ocr.dob : prev.dateOfBirth),
        }));
        if (ocr.idNumber) {
          setOcrIdNumber(ocr.idNumber);
        }
        // Mark OCR as completed on successful extraction
        setOcrStepCompleted(true);
      } else {
        setOcrUnavailable(true);
        if (r.status === 409) {
          // Duplicate approved user - show message and don't disable OCR permanently
          setOcrUnavailable(false);
          Alert.alert('ID Already Registered', data?.error || 'This ID is already registered to an approved resident account. Please contact administration if you believe this is an error.');
        } else if (r.status === 400 && data?.details?.includes('Document type mismatch')) {
          // Document type mismatch - show error and allow retry
          Alert.alert('Document Type Mismatch', data?.details || 'The ID you uploaded does not match the selected document type. Please verify your selection and try again.');
        } else if (!r.ok) {
          Alert.alert('OCR failed', data?.error || data?.details || 'Failed to OCR ID');
        }
      }
    } catch (e) {
      Alert.alert('OCR failed', e?.message || 'Failed to OCR ID');
      // Don’t permanently disable OCR on a single failure (often a transient upload issue).
    } finally {
      setOcrLoading(false);
    }
  }, [idDocs, lastOcrAt, lastOcrSignature, ocrLoading, ocrUnavailable]);

  const handleIdUploadComplete = useCallback(async () => {
    if (!idDocs.frontUri || !idDocs.backUri) {
      Alert.alert('Missing images', 'Please select both front and back ID images first.');
      return;
    }

    setOcrLoading(true);
    try {
      if (registrationMode === 'ocr') {
        // Wait for OCR to complete only when OCR mode is selected
        await tryOcrAutofill();
      }
      
      // After OCR completes, hide the ID upload step and show the form
      setShowIdUploadStep(false);
      setOcrStepCompleted(true);
    } catch (error) {
      Alert.alert('OCR Error', 'Failed to process ID images. Please try again.');
    } finally {
      setOcrLoading(false);
    }
  }, [idDocs, registrationMode, tryOcrAutofill]);

  useEffect(() => {
    if (!idDocs.frontUri || !idDocs.backUri) return;
    if (ocrLoading || ocrUnavailable) return;
    if (registrationMode !== 'ocr') return;
    tryOcrAutofill();
  }, [idDocs.frontUri, idDocs.backUri, ocrLoading, ocrUnavailable, registrationMode, tryOcrAutofill]);

  useEffect(() => {
    const checkEmailAvailability = async () => {
      if (!formData.email || !isValidEmail(formData.email)) return;
      setCheckingAvailability(prev => ({ ...prev, email: true }));
      try {
        const response = await api.post('/auth/check-availability', { type: 'email', value: formData.email });
        setAvailability(prev => ({ ...prev, email: response.data.available }));
      } catch (error) {
        console.error('Email check error:', error);
      } finally {
        setCheckingAvailability(prev => ({ ...prev, email: false }));
      }
    };
    const timer = setTimeout(checkEmailAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.email]);

  useEffect(() => {
    const checkPhoneAvailability = async () => {
      if (!formData.phone || !/^\d{10}$/.test(formData.phone)) return;
      setCheckingAvailability(prev => ({ ...prev, phone: true }));
      try {
        const response = await api.post('/auth/check-availability', { type: 'phone', value: formData.phone });
        setAvailability(prev => ({ ...prev, phone: response.data.available }));
      } catch (error) {
        console.error('Phone check error:', error);
      } finally {
        setCheckingAvailability(prev => ({ ...prev, phone: false }));
      }
    };
    const timer = setTimeout(checkPhoneAvailability, 500);
    return () => clearTimeout(timer);
  }, [formData.phone]);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Profile photo handling functions
  const selectProfilePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required to select a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
        Alert.alert('Photo Selected', 'Profile photo selected successfully!');
      }
    } catch (error) {
      console.error('Error selecting profile photo:', error);
      Alert.alert('Error', 'Failed to select profile photo');
    }
  };

  const takeProfilePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Camera permission is required to take a profile photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setProfilePhoto(result.assets[0].uri);
        Alert.alert('Photo Taken', 'Profile photo captured successfully!');
      }
    } catch (error) {
      console.error('Error taking profile photo:', error);
      Alert.alert('Error', 'Failed to take profile photo');
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    else if (formData.firstName.length < 2) newErrors.firstName = 'First name must be at least 2 characters';

    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    else if (formData.lastName.length < 2) newErrors.lastName = 'Last name must be at least 2 characters';

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email';
    else if (availability.email === false) newErrors.email = 'This email is already registered';

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      const phoneRegex = /^9\d{9}$/;
      if (!phoneRegex.test(formData.phone)) {
        newErrors.phone = 'Phone number must be 10 digits starting with 9 (e.g., 9662342234)';
      }
    }
    if (availability.phone === false) newErrors.phone = 'This phone number is already registered';

    if (!formData.address.trim()) newErrors.address = 'Address is required';
    else if (formData.address.length < 5) newErrors.address = 'Address must be at least 5 characters';

    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and numbers';
    }

    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    if (!formData.selectedLot) newErrors.selectedLot = 'Please select a lot';

    // Validate vehicle car images
    if (!formData.noVehicles && formData.vehicles.length > 0) {
      formData.vehicles.forEach((vehicle, index) => {
        if (!vehicle.carImage) {
          newErrors[`vehicle_${index}_carImage`] = `Car photo is required for Vehicle ${index + 1}`;
        }
      });
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert('Validation Error', 'Please check all fields');
      return;
    }

    setLoading(true);
    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();

      // Add text fields
      formDataToSend.append('firstName', formData.firstName.trim());
      formDataToSend.append('lastName', formData.lastName.trim());
      if (formData.middleName.trim()) {
        formDataToSend.append('middleName', formData.middleName.trim());
      }
      if (formData.dateOfBirth.trim()) {
        formDataToSend.append('dateOfBirth', formData.dateOfBirth.trim());
      }
      formDataToSend.append('email', formData.email.trim());
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('address', formData.address.trim());
      formDataToSend.append('role', 'resident');
      formDataToSend.append('selectedLot', formData.selectedLot);
      formDataToSend.append('countryCode', formData.countryCode);
      
      // Handle vehicles with car images
      const vehiclesWithoutImages = formData.vehicles.map(vehicle => ({
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        color: vehicle.color
      }));
      formDataToSend.append('vehicles', JSON.stringify(vehiclesWithoutImages));
      
      // Add car images separately
      for (let index = 0; index < formData.vehicles.length; index++) {
        const vehicle = formData.vehicles[index];
        if (vehicle.carImage) {
          const filename = `vehicle-${index + 1}-car.jpg`;
          const fileType = 'image/jpeg';

          if (Platform.OS === 'web') {
            // For web, fetch the blob and append
            const response = await fetch(vehicle.carImage);
            const blob = await response.blob();
            formDataToSend.append(`vehicleImage_${index}`, blob, filename);
          } else {
            // For mobile, use the URI directly
            formDataToSend.append(`vehicleImage_${index}`, {
              uri: vehicle.carImage,
              name: filename,
              type: fileType,
            });
          }
        }
      }
      
      formDataToSend.append('familyMembers', JSON.stringify(formData.familyMembers || []));
      if (ocrIdNumber.trim()) {
        formDataToSend.append('idNumber', ocrIdNumber.trim());
      }
      formDataToSend.append('documentType', formData.documentType);

      // Add profile photo if selected
      if (profilePhoto) {
        const filename = profilePhoto.split('/').pop() || 'profile-photo.jpg';
        const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

        if (Platform.OS === 'web') {
          // For web, fetch the blob and append
          const response = await fetch(profilePhoto);
          const blob = await response.blob();
          formDataToSend.append('profilePhoto', blob, filename);
        } else {
          // For mobile, use the URI directly
          formDataToSend.append('profilePhoto', {
            uri: profilePhoto,
            name: filename,
            type: fileType,
          });
        }
      }

      const response = await api.post('/auth/register', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      if (response.data.success) {
        const registeredUser = response.data.user || null;

        if (response.data.token) {
          try {
            await AsyncStorage.setItem('token', response.data.token);
            if (registeredUser) {
              await AsyncStorage.setItem('user', JSON.stringify(registeredUser));
              updateUser(registeredUser);
            }
            api.defaults.headers.common.Authorization = `Bearer ${response.data.token}`;
          } catch (storageError) {
            console.error('Failed to persist registration token:', storageError);
          }
        }

        // If resident selected ID images, upload in background after navigating away
        const { frontUri, backUri } = idDocs || {};
        if (frontUri && backUri && Platform.OS !== 'web') {
          (async () => {
            try {
              const ensureFileUriAsync = async (uri, name) => {
                const u = String(uri || '');
                if (Platform.OS === 'android' && u.startsWith('content://')) {
                  const ext = u.toLowerCase().includes('.png') ? 'png' : 'jpg';
                  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || '';
                  const safeBase = name.replace(/\.[^.]+$/, '');
                  const dest = `${baseDir}${safeBase}_${Date.now()}.${ext}`;
                  await FileSystem.copyAsync({ from: u, to: dest });
                  return dest;
                }
                return u;
              };

              const mkFileAsync = async (uri, name) => {
                const fileUri = await ensureFileUriAsync(uri, name);
                const lower = String(fileUri).toLowerCase();
                const type = lower.endsWith('.png') ? 'image/png' : 'image/jpeg';
                return { uri: fileUri, name, type };
              };

              const fd = new FormData();
              fd.append('email', formData.email);
              fd.append('documentType', formData.documentType || 'national_id');
              fd.append('frontImage', await mkFileAsync(frontUri, 'front.jpg'));
              fd.append('backImage', await mkFileAsync(backUri, 'back.jpg'));

              await api.post('/verifications/upload-id', fd);
            } catch (e) {
              console.error('upload-id after register failed:', e);
            }
          })();
        }

        navigation.replace('PendingApproval', {
          registration: registeredUser
            ? { ...registeredUser, phone: formData.phone }
            : {
                firstName: formData.firstName,
                lastName: formData.lastName,
                email: formData.email,
                phone: formData.phone,
              },
        });
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityIcon = (field) => {
    if (checkingAvailability[field]) {
      return <ActivityIndicator size="small" color={themeColors.primary} />;
    }
    if (availability[field] === true) {
      return <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />;
    }
    if (availability[field] === false) {
      return <Ionicons name="close-circle" size={20} color={themeColors.error} />;
    }
    return null;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const statusConfig = {
    vacant: { color: '#22c55e', bg: '#dcfce7', label: 'Vacant', border: '#16a34a' },
    occupied: { color: '#ef4444', bg: '#fee2e2', label: 'Occupied', border: '#dc2626' },
    reserved: { color: '#f59e0b', bg: '#fef3c7', label: 'Reserved', border: '#d97706' },
  };

  const getStatusConfig = (status) => statusConfig[status] || statusConfig.vacant;

  const selectedCountry = getSelectedCountry();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={themeColors.textPrimary} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={32} color="white" />
          </View>
          <View>
            <Text style={styles.subtitle}>WESTVILLE CASIMIRO HOMES</Text>
            <Text style={styles.title}>Resident Registration</Text>
          </View>
        </View>

        {route.params?.lot && (
          <View style={styles.successAlert}>
            <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
            <Text style={styles.alertText}>Lot pre-selected! Block {route.params.block}, Lot {route.params.lot}</Text>
          </View>
        )}

        <View style={styles.registrationModePrompt}>
          <Text style={styles.registrationIntroTitle}>Choose how you want to register</Text>
          <Text style={styles.registrationIntroSubtitle}>
            Select manual entry or upload ID for OCR before completing the registration form.
          </Text>

          {!registrationMode ? (
            <View>
              <TouchableOpacity style={styles.modeCard} onPress={() => {
                setRegistrationMode('manual');
                setShowIdUploadStep(false);
                setOcrStepCompleted(false);
              }}>
                <Text style={styles.modeTitle}>Manual entry</Text>
                <Text style={styles.modeDescription}>
                  Enter your details manually and upload your ID. The ID upload will be used for verification only and will not trigger OCR automatically.
                </Text>
                <View style={styles.modeButton}>
                  <Text style={styles.modeButtonText}>Register manually</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modeCard} onPress={() => {
                setRegistrationMode('ocr');
                setShowIdUploadStep(true);
                setOcrStepCompleted(false);
              }}>
                <Text style={styles.modeTitle}>ID upload + OCR autofill</Text>
                <Text style={styles.modeDescription}>
                  Upload your ID and let the OCR attempt to populate your name, date of birth, and ID number automatically.
                </Text>
                <View style={styles.modeButton}>
                  <Text style={styles.modeButtonText}>Use OCR autofill</Text>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.selectedModeBanner}>
              <Text style={styles.selectedModeTitle}>
                You selected: {registrationMode === 'manual' ? 'Manual entry' : 'OCR autofill'}
              </Text>
              <Text style={styles.selectedModeText}>
                {registrationMode === 'manual'
                  ? 'Please fill in your fields manually. Your ID upload will be used for verification only and will not trigger OCR automatically.'
                  : 'Upload your ID images to automatically populate your name, date of birth, and ID number where possible.'}
              </Text>
              <TouchableOpacity style={styles.selectedModeChangeButton} onPress={() => setRegistrationMode(null)}>
                <Text style={styles.selectedModeChangeText}>Change registration method</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {showIdUploadStep && (
          <View style={[styles.formCard, shadows.medium]}>
            <View style={styles.idUploadHeader}>
              <Ionicons name="document" size={32} color={themeColors.primary} />
              <Text style={styles.idUploadTitle}>Upload Your ID for OCR</Text>
              <Text style={styles.idUploadSubtitle}>
                Please upload both front and back images of your government-issued ID. The system will automatically extract your information.
              </Text>
              <Text style={styles.sectionLabel}>ID document type</Text>
              <View style={styles.idTypeRow}>
                {ID_DOCUMENT_TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.idTypeOption,
                      formData.documentType === option.value && styles.idTypeOptionActive,
                    ]}
                    onPress={() => {
                      handleChange('documentType', option.value);
                      // Reset OCR state when document type changes
                      setOcrStepCompleted(false);
                      setOcrUnavailable(false);
                      setLastOcrSignature('');
                      setLastOcrAt(0);
                    }}
                  >
                    <Text style={[
                      styles.idTypeOptionText,
                      formData.documentType === option.value && styles.idTypeOptionTextActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.ocrBox}>
              <View style={styles.ocrTitleRow}>
                <Text style={styles.ocrTitle}>ID Images</Text>
                {ocrLoading ? <ActivityIndicator size="small" color={themeColors.primary} /> : null}
              </View>
              <Text style={styles.ocrSub}>
                Select both front and back images of your ID for automatic data extraction.
              </Text>
              <View style={styles.ocrBtnRow}>
                <TouchableOpacity style={styles.ocrBtn} onPress={() => pickIdImage('front')} disabled={ocrLoading}>
                  <Ionicons name="camera" size={20} color={themeColors.primary} />
                  <Text style={styles.ocrBtnText}>{idDocs.frontUri ? 'Front selected ✓' : 'Pick front'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ocrBtn} onPress={() => pickIdImage('back')} disabled={ocrLoading}>
                  <Ionicons name="camera" size={20} color={themeColors.primary} />
                  <Text style={styles.ocrBtnText}>{idDocs.backUri ? 'Back selected ✓' : 'Pick back'}</Text>
                </TouchableOpacity>
              </View>
              {idDocs.frontUri && idDocs.backUri && !ocrLoading && (
                <Text style={styles.ocrHint}>
                  Both images selected! Click "Process ID" to extract your information.
                </Text>
              )}
              {ocrUnavailable && (
                <View>
                  <Text style={styles.ocrHint}>
                    OCR encountered an issue. You can try again or continue manually.
                  </Text>
                  <TouchableOpacity
                    style={[styles.mapButton, { marginTop: 12 }]}
                    onPress={() => {
                      setOcrUnavailable(false);
                      setLastOcrSignature('');
                      setLastOcrAt(0);
                    }}
                  >
                    <Text style={styles.mapButtonText}>Try Again</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.idUploadActions}>
              <TouchableOpacity 
                style={[styles.submitButton, (!idDocs.frontUri || !idDocs.backUri || ocrLoading) && styles.submitButtonDisabled]}
                onPress={handleIdUploadComplete}
                disabled={!idDocs.frontUri || !idDocs.backUri || ocrLoading}
              >
                <Text style={styles.submitButtonText}>
                  {ocrLoading ? 'Processing...' : 'Process ID & Continue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.mapButton, { marginTop: 12 }]} 
                onPress={() => {
                  setShowIdUploadStep(false);
                  setRegistrationMode('manual');
                  setOcrStepCompleted(false);
                }}
              >
                <Text style={styles.mapButtonText}>Skip OCR & Enter Manually</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {registrationMode && (!showIdUploadStep && (registrationMode !== 'ocr' || ocrStepCompleted)) && (
          <View style={[styles.formCard, shadows.medium]}>
          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="First Name" value={formData.firstName} onChangeText={(text) => handleChange('firstName', text)} />
          </View>
          {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Last Name" value={formData.lastName} onChangeText={(text) => handleChange('lastName', text)} />
          </View>
          {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="person" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Middle Name (optional)" value={formData.middleName} onChangeText={(text) => handleChange('middleName', text)} />
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="calendar" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TouchableOpacity style={{ flex: 1 }} onPress={openDobPicker} activeOpacity={0.8}>
              <TextInput
                style={styles.input}
                placeholder="Date of Birth (tap to pick) (optional)"
                value={formData.dateOfBirth}
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>
            {formData.dateOfBirth ? (
              <TouchableOpacity onPress={() => handleChange('dateOfBirth', '')}>
                <Ionicons name="close-circle" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={openDobPicker}>
                <Ionicons name="chevron-down" size={18} color={themeColors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {dobPickerOpen && Platform.OS !== 'web' ? (
            <DateTimePicker
              mode="date"
              value={dobTemp || new Date()}
              maximumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                if (event?.type === 'dismissed') {
                  setDobPickerOpen(false);
                  return;
                }
                const next = selectedDate || dobTemp;
                if (Platform.OS !== 'ios') setDobPickerOpen(false);
                if (next) {
                  setDobTemp(next);
                  handleChange('dateOfBirth', formatYyyyMmDd(next));
                }
              }}
            />
          ) : null}

          <Modal
            visible={dobPickerOpen && Platform.OS === 'web'}
            transparent
            animationType="fade"
            onRequestClose={() => setDobPickerOpen(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.successModal, { padding: 18, alignItems: 'stretch' }]}>
                <Text style={[styles.successTitle, { fontSize: 18 }]}>Select Date of Birth</Text>
                <View style={{ marginTop: 10 }}>
                  {WebDateInput ? (
                    <WebDateInput
                      value={dobTemp ? formatYyyyMmDd(dobTemp) : ''}
                      onChange={(v) => {
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
                        const d = new Date(v + 'T00:00:00');
                        if (!Number.isNaN(d.getTime())) setDobTemp(d);
                      }}
                    />
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.submitButton, { marginTop: 12 }]}
                  onPress={() => {
                    if (dobTemp) handleChange('dateOfBirth', formatYyyyMmDd(dobTemp));
                    setDobPickerOpen(false);
                  }}
                >
                  <Text style={styles.submitButtonText}>Done</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.mapButton, { marginTop: 10 }]} onPress={() => setDobPickerOpen(false)}>
                  <Text style={[styles.mapButtonText, { fontWeight: '900' }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <View style={styles.ocrBox}>
            <View style={styles.ocrTitleRow}>
              <Text style={styles.ocrTitle}>ID OCR Autofill (optional)</Text>
              {ocrLoading ? <ActivityIndicator size="small" color={themeColors.primary} /> : null}
            </View>
            <Text style={styles.ocrSub}>
              Upload front/back ID images to autofill name and DOB. OCR runs on the backend (fast + stable).
            </Text>
            <Text style={styles.sectionLabel}>ID document type</Text>
            <View style={styles.idTypeRow}>
              {ID_DOCUMENT_TYPE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.idTypeOption,
                    formData.documentType === option.value && styles.idTypeOptionActive,
                  ]}
                  onPress={() => handleChange('documentType', option.value)}
                >
                  <Text style={[
                    styles.idTypeOptionText,
                    formData.documentType === option.value && styles.idTypeOptionTextActive,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.ocrBtnRow}>
              <TouchableOpacity style={styles.ocrBtn} onPress={() => pickIdImage('front')} disabled={ocrLoading}>
                <Text style={styles.ocrBtnText}>{idDocs.frontUri ? 'Front selected' : 'Pick front'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ocrBtn} onPress={() => pickIdImage('back')} disabled={ocrLoading}>
                <Text style={styles.ocrBtnText}>{idDocs.backUri ? 'Back selected' : 'Pick back'}</Text>
              </TouchableOpacity>
            </View>
            {ocrUnavailable ? (
              <Text style={styles.ocrHint}>
                OCR unavailable. Please try again later.
              </Text>
            ) : (
              <Text style={styles.ocrHint}>
                OCR will run automatically once both front and back ID images are selected.
              </Text>
            )}
          </View>

          <View style={styles.ocrBox}>
            <View style={styles.ocrTitleRow}>
              <Text style={styles.ocrTitle}>Profile Picture (optional)</Text>
            </View>
            <Text style={styles.ocrSub}>
              Upload a photo to set as your profile picture.
            </Text>
            <View style={styles.ocrBtnRow}>
              <TouchableOpacity style={styles.ocrBtn} onPress={selectProfilePhoto}>
                <Ionicons name="images" size={16} color={themeColors.primary} />
                <Text style={styles.ocrBtnText}>Select Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ocrBtn} onPress={takeProfilePhoto}>
                <Ionicons name="camera" size={16} color={themeColors.primary} />
                <Text style={styles.ocrBtnText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
            {profilePhoto && (
              <View style={styles.profilePhotoPreview}>
                <Text style={styles.ocrHint}>Profile photo selected ✓</Text>
              </View>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="mail" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Email Address" value={formData.email} onChangeText={(text) => handleChange('email', text)} keyboardType="email-address" autoCapitalize="none" />
            {getAvailabilityIcon('email')}
          </View>
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

          {/* Phone Number with Country Code */}
          <View>
            <View style={styles.phoneRow}>
              {/* Country Code Dropdown Button */}
              <TouchableOpacity style={styles.countryCodeButton} onPress={() => setShowCountryCodeDropdown(true)}>
                <Text style={styles.countryCodeFlag}>{selectedCountry.flag}</Text>
                <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                <Ionicons name="chevron-down" size={16} color={themeColors.textSecondary} />
              </TouchableOpacity>

              {/* Phone Number Input */}
              <View style={styles.phoneInputContainer}>
                <Ionicons name="call" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9662342234"
                  value={formData.phone}
                  onChangeText={(text) => handleChange('phone', text)}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                {getAvailabilityIcon('phone')}
              </View>
            </View>
            <Text style={styles.phoneHelperText}>
              {selectedCountry.flag} {selectedCountry.code} - {selectedCountry.country}: {selectedCountry.example}
            </Text>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Address Input */}
          <View style={styles.inputContainer}>
            <Ionicons name="location" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                { minHeight: 80 },
                formData.selectedLot && { backgroundColor: '#f5f5f5' }
              ]}
              placeholder={formData.selectedLot ? "Address auto-filled from selected lot" : "Enter your residential address"}
              value={formData.address}
              onChangeText={(text) => handleChange('address', text)}
              multiline
              numberOfLines={3}
              maxLength={250}
              editable={!formData.selectedLot}
            />
            {formData.selectedLot && (
              <Text style={[styles.helperText, { marginTop: 5 }]}>
                Address auto-filled from selected lot
              </Text>
            )}
          </View>
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleOption, formData.noVehicles && styles.toggleOptionActive]}
              onPress={toggleNoVehicles}
            >
              <Ionicons
                name={formData.noVehicles ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={formData.noVehicles ? themeColors.primary : themeColors.textSecondary}
              />
              <Text style={styles.toggleOptionText}>No vehicles to register</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleOption, formData.soloResident && styles.toggleOptionActive]}
              onPress={toggleSoloResident}
            >
              <Ionicons
                name={formData.soloResident ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={formData.soloResident ? themeColors.primary : themeColors.textSecondary}
              />
              <Text style={styles.toggleOptionText}>Solo resident / no family members</Text>
            </TouchableOpacity>
          </View>

          {!formData.noVehicles && (
            <View style={styles.arraySection}>
              <Text style={styles.sectionLabel}>Registered Vehicles</Text>
              {formData.vehicles.map((vehicle, index) => (
                <View key={`vehicle-${index}`} style={styles.arrayCard}>
                  <View style={styles.arrayHeader}>
                    <Text style={styles.arrayTitle}>Vehicle {index + 1}</Text>
                    {formData.vehicles.length > 1 && (
                      <TouchableOpacity onPress={() => removeVehicle(index)}>
                        <Text style={styles.arrayRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Plate Number"
                      value={vehicle.plateNumber}
                      onChangeText={(text) => handleArrayFieldChange('vehicles', index, 'plateNumber', text)}
                    />
                  </View>

                  <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Make"
                      value={vehicle.make}
                      onChangeText={(text) => handleArrayFieldChange('vehicles', index, 'make', text)}
                    />
                  </View>

                  <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Model"
                      value={vehicle.model}
                      onChangeText={(text) => handleArrayFieldChange('vehicles', index, 'model', text)}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Color"
                      value={vehicle.color}
                      onChangeText={(text) => handleArrayFieldChange('vehicles', index, 'color', text)}
                    />
                  </View>

                  <View style={styles.photoSection}>
                    <Text style={styles.photoLabel}>Car Photo (Required)</Text>
                    <View style={styles.photoButtons}>
                      <TouchableOpacity style={styles.photoButton} onPress={() => pickCarImage(index)}>
                        <Ionicons name="images" size={20} color={themeColors.primary} />
                        <Text style={styles.photoButtonText}>
                          {vehicle.carImage ? 'Change Photo' : 'Select Photo'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.photoButton} onPress={() => takeCarPhoto(index)}>
                        <Ionicons name="camera" size={20} color={themeColors.primary} />
                        <Text style={styles.photoButtonText}>Take Photo</Text>
                      </TouchableOpacity>
                    </View>
                    {vehicle.carImage && (
                      <Text style={styles.photoSelectedText}>✓ Photo selected</Text>
                    )}
                    {errors[`vehicle_${index}_carImage`] && (
                      <Text style={styles.errorText}>{errors[`vehicle_${index}_carImage`]}</Text>
                    )}
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addRowButton} onPress={addVehicle}>
                <Ionicons name="add-circle-outline" size={18} color={themeColors.primary} />
                <Text style={styles.addRowButtonText}>Add another vehicle</Text>
              </TouchableOpacity>
            </View>
          )}

          {!formData.soloResident && (
            <View style={styles.arraySection}>
              <Text style={styles.sectionLabel}>Family Members</Text>
              {formData.familyMembers.map((member, index) => (
                <View key={`family-${index}`} style={styles.arrayCard}>
                  <View style={styles.arrayHeader}>
                    <Text style={styles.arrayTitle}>Family Member {index + 1}</Text>
                    {formData.familyMembers.length > 1 && (
                      <TouchableOpacity onPress={() => removeFamilyMember(index)}>
                        <Text style={styles.arrayRemoveText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Name"
                      value={member.name}
                      onChangeText={(text) => handleArrayFieldChange('familyMembers', index, 'name', text)}
                    />
                  </View>

                  <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Relationship"
                      value={member.relationship}
                      onChangeText={(text) => handleArrayFieldChange('familyMembers', index, 'relationship', text)}
                    />
                  </View>

                  <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                    <TextInput
                      style={styles.input}
                      placeholder="Age"
                      value={member.age}
                      onChangeText={(text) => handleArrayFieldChange('familyMembers', index, 'age', text)}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone"
                      value={member.phone}
                      onChangeText={(text) => handleArrayFieldChange('familyMembers', index, 'phone', text)}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.addRowButton} onPress={addFamilyMember}>
                <Ionicons name="add-circle-outline" size={18} color={themeColors.primary} />
                <Text style={styles.addRowButtonText}>Add another family member</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Password" value={formData.password} onChangeText={(text) => handleChange('password', text)} secureTextEntry={!showPassword} />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color={themeColors.textSecondary} style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Confirm Password" value={formData.confirmPassword} onChangeText={(text) => handleChange('confirmPassword', text)} secureTextEntry={!showConfirmPassword} />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={20} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

          <Text style={styles.sectionLabel}>Select Your Lot</Text>
          
          {loadingLots ? (
            <View style={styles.loadingLotsContainer}>
              <ActivityIndicator size="small" color={themeColors.primary} />
              <Text style={styles.loadingLotsText}>Loading available lots...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={20} color={themeColors.error} />
              <Text style={styles.errorBoxText}>{loadError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchLots}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : availableLots.length === 0 ? (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color={themeColors.warning} />
              <Text style={styles.warningText}>No available lots found. Please contact admin.</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowLotDropdown(true)}>
                <View style={styles.dropdownLeft}>
                  <Ionicons name="home" size={20} color={themeColors.textSecondary} />
                  <Text style={styles.dropdownText}>
                    {formData.selectedLot ? `${formData.selectedLot} - ${selectedLotDetails?.type || ''}` : `Select a lot (${availableLots.length} available)`}
                  </Text>
                </View>
                <Ionicons name="chevron-down" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
              
              {errors.selectedLot && <Text style={styles.errorText}>{errors.selectedLot}</Text>}
              
              <TouchableOpacity style={styles.mapButton} onPress={() => setShowMapModal(true)}>
                <Ionicons name="map" size={20} color={themeColors.primary} />
                <Text style={styles.mapButtonText}>View Interactive Lot Map</Text>
              </TouchableOpacity>
              
              {selectedLotDetails && (
                <View style={styles.selectedLotCard}>
                  <View style={styles.selectedLotHeader}>
                    <Ionicons name="location" size={18} color={themeColors.primary} />
                    <Text style={styles.selectedLotTitle}>Selected Lot Details</Text>
                  </View>
                  <View style={styles.selectedLotGrid}>
                    <View style={styles.selectedLotItem}>
                      <Text style={styles.selectedLotLabel}>Lot ID:</Text>
                      <Text style={styles.selectedLotValue}>{selectedLotDetails.lotId}</Text>
                    </View>
                    <View style={styles.selectedLotItem}>
                      <Text style={styles.selectedLotLabel}>Type:</Text>
                      <Text style={styles.selectedLotValue}>{selectedLotDetails.type}</Text>
                    </View>
                    <View style={styles.selectedLotItem}>
                      <Text style={styles.selectedLotLabel}>Area:</Text>
                      <Text style={styles.selectedLotValue}>{selectedLotDetails.sqm} sqm</Text>
                    </View>
                  </View>
                </View>
              )}
              
              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color={themeColors.info} />
                <Text style={styles.infoText}>Once you register, your selected lot will be reserved pending admin approval.</Text>
              </View>
            </>
          )}

          <TouchableOpacity style={[styles.submitButton, (loading || loadingLots || availableLots.length === 0) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={loading || loadingLots || availableLots.length === 0}>
            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Create Account</Text>}
          </TouchableOpacity>

          <View style={styles.loginLink}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <TouchableOpacity onPress={safeGoToLogin}>
              <Text style={styles.loginButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>
          </View>
        )}
      </ScrollView>

      {/* Country Code Dropdown Modal */}
      <Modal visible={showCountryCodeDropdown} animationType="slide" transparent onRequestClose={() => setShowCountryCodeDropdown(false)}>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryCodeDropdown(false)}>
                <Ionicons name="close" size={24} color={themeColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRY_CODES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryOption, formData.countryCode === item.code && styles.countryOptionSelected]}
                  onPress={() => {
                    handleChange('countryCode', item.code);
                    setShowCountryCodeDropdown(false);
                  }}
                >
                  <View style={styles.countryOptionLeft}>
                    <Text style={styles.countryOptionFlag}>{item.flag}</Text>
                    <Text style={styles.countryOptionCode}>{item.code}</Text>
                    <Text style={styles.countryOptionName}>{item.country}</Text>
                  </View>
                  {formData.countryCode === item.code && (
                    <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Lot Dropdown Modal */}
      <Modal visible={showLotDropdown} animationType="slide" transparent onRequestClose={() => setShowLotDropdown(false)}>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownModal}>
            <View style={styles.dropdownModalHeader}>
              <Text style={styles.dropdownModalTitle}>Select a Lot ({availableLots.length} available)</Text>
              <TouchableOpacity onPress={() => setShowLotDropdown(false)}><Ionicons name="close" size={24} color={themeColors.textPrimary} /></TouchableOpacity>
            </View>
            <FlatList
              data={availableLots}
              keyExtractor={(item) => item.lotId}
              renderItem={({ item }) => (
                <TouchableOpacity style={[styles.lotOption, formData.selectedLot === item.lotId && styles.lotOptionSelected]} onPress={() => handleLotSelect(item)}>
                  <View style={styles.lotOptionLeft}>
                    <Text style={styles.lotOptionId}>{item.lotId}</Text>
                    <Text style={styles.lotOptionType}>{item.type}</Text>
                  </View>
                  <View style={styles.lotOptionRight}>
                    <Text style={styles.lotOptionSqm}>{item.sqm} sqm</Text>
                    {formData.selectedLot === item.lotId && <Ionicons name="checkmark-circle" size={20} color={themeColors.success} />}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <RegisterLotMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        allLots={allLots}
        availableLots={availableLots}
        selectedLotId={formData.selectedLot}
        onSelectLot={handleLotSelect}
      />

    </View>
  );
};

export default RegisterScreen;