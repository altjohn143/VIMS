const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/screens/**/*.js', { cwd: 'VIMS_Mobile' });

console.log('=== UI Audit ===');

files.forEach(f => {
  const code = fs.readFileSync('VIMS_Mobile/' + f, 'utf8');
  
  // Check for inline DateTimePicker without iOS header/done button
  if (code.includes("display={Platform.OS === 'ios' ? 'inline'")) {
    if (!code.includes('inlineExportPickerHeader') && !code.includes('inlineExportPickerDone')) {
      console.log(f + ': iOS inline DateTimePicker without Done button/header');
    }
  }
  
  // Check for absolute positioning
  if (code.includes("position: 'absolute'") || code.includes('position: "absolute"')) {
    console.log(f + ': Uses absolute positioning');
  }
  
  // Check for fixed large widths
  if (code.includes('width: 400') || code.includes('width: 500') || code.includes('width: 600')) {
    console.log(f + ': Has large fixed width');
  }
});

console.log('Done');