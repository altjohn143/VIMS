// Simple test file to verify fetch works with the backend
// This bypasses axios to test the underlying network stack

export const testDirectFetch = async () => {
  const url = 'https://vims-backend.onrender.com/api/health';
  
  console.log('🧪 Testing direct fetch to:', url);
  console.log('   Attempting native fetch without axios...');
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'VIMSMobileApp/1.0'
      },
      timeout: 10000,
    });
    
    console.log('✅ Fetch succeeded!');
    console.log('   Status:', response.status);
    console.log('   Headers:', {
      'content-type': response.headers.get('content-type'),
    });
    
    const data = await response.json();
    console.log('   Body:', data);
    
    return { success: true, data };
  } catch (error) {
    console.error('❌ Direct fetch failed:', error.message);
    console.error('   Error type:', error.name);
    console.error('   Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      message: error.message,
    });
    return { success: false, error: error.message };
  }
};

// Export a test that can be called from screens
export default testDirectFetch;
