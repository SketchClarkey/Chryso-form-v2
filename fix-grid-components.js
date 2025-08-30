const fs = require('fs');
const path = require('path');

// List of files that contain Grid usage
const filesWithGrid = [
  'D:/Chryso-Form/apps/client/src/components/upload/EnhancedFileUploader.tsx',
  'D:/Chryso-Form/apps/client/src/components/mobile/MobileDashboard.tsx',
  'D:/Chryso-Form/apps/client/src/components/dataRetention/DataRetentionManager.tsx',
  'D:/Chryso-Form/apps/client/src/components/analytics/TrendAnalysis.tsx',
  'D:/Chryso-Form/apps/client/src/pages/Templates.tsx',
  'D:/Chryso-Form/apps/client/src/pages/Settings.tsx',
  'D:/Chryso-Form/apps/client/src/pages/SearchResults.tsx',
  'D:/Chryso-Form/apps/client/src/pages/SearchDashboard.tsx',
  'D:/Chryso-Form/apps/client/src/pages/Profile.tsx',
  'D:/Chryso-Form/apps/client/src/pages/DashboardSettings.tsx',
  'D:/Chryso-Form/apps/client/src/pages/DashboardManager.tsx',
  'D:/Chryso-Form/apps/client/src/pages/AdvancedFiltering.tsx',
  'D:/Chryso-Form/apps/client/src/components/worksites/WorksiteForm.tsx',
  'D:/Chryso-Form/apps/client/src/components/templates/TemplateDetail.tsx',
  'D:/Chryso-Form/apps/client/src/components/templates/TemplateBuilder.tsx',
  'D:/Chryso-Form/apps/client/src/components/templates/SectionEditor.tsx',
  'D:/Chryso-Form/apps/client/src/components/templates/FieldEditor.tsx',
  'D:/Chryso-Form/apps/client/src/components/settings/UserPreferences.tsx',
  'D:/Chryso-Form/apps/client/src/components/settings/SecuritySettings.tsx',
  'D:/Chryso-Form/apps/client/src/components/settings/IntegrationSettings.tsx',
  'D:/Chryso-Form/apps/client/src/components/settings/GeneralSettings.tsx',
  'D:/Chryso-Form/apps/client/src/components/settings/FeatureSettings.tsx',
  'D:/Chryso-Form/apps/client/src/components/settings/CustomizationSettings.tsx',
  'D:/Chryso-Form/apps/client/src/components/security/SecurityMonitoringDashboard.tsx',
  'D:/Chryso-Form/apps/client/src/components/reports/ReportViewer.tsx',
  'D:/Chryso-Form/apps/client/src/components/reports/ReportScheduler.tsx',
  'D:/Chryso-Form/apps/client/src/components/reports/ReportList.tsx',
  'D:/Chryso-Form/apps/client/src/components/reports/ReportBuilder.tsx',
  'D:/Chryso-Form/apps/client/src/components/reports/ExportDialog.tsx',
  'D:/Chryso-Form/apps/client/src/components/forms/FormEditor.tsx',
  'D:/Chryso-Form/apps/client/src/components/filters/FilterPresets.tsx',
  'D:/Chryso-Form/apps/client/src/components/filters/FilterManager.tsx',
  'D:/Chryso-Form/apps/client/src/components/email/EmailTemplateStats.tsx',
  'D:/Chryso-Form/apps/client/src/components/email/EmailTemplatePreview.tsx',
  'D:/Chryso-Form/apps/client/src/components/email/EmailTemplateManager.tsx',
  'D:/Chryso-Form/apps/client/src/components/email/EmailTemplateEditor.tsx',
  'D:/Chryso-Form/apps/client/src/components/dashboards/widgets/ChartWidget.tsx',
  'D:/Chryso-Form/apps/client/src/components/dashboards/DashboardViewer.tsx',
  'D:/Chryso-Form/apps/client/src/components/dashboards/DashboardBuilder.tsx',
  'D:/Chryso-Form/apps/client/src/components/charts/FormTrendsChart.tsx',
  'D:/Chryso-Form/apps/client/src/components/charts/FormStatusChart.tsx',
  'D:/Chryso-Form/apps/client/src/components/camera/MobileCameraCapture.tsx',
  'D:/Chryso-Form/apps/client/src/components/audit/SecurityDashboard.tsx',
  'D:/Chryso-Form/apps/client/src/components/audit/AuditLogViewer.tsx'
];

function fixGridInFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Replace Grid import with Grid2
    const gridImportRegex = /(\s+)Grid,/g;
    if (content.match(gridImportRegex)) {
      content = content.replace(gridImportRegex, '$1Grid2,');
      modified = true;
    }

    // Replace Grid container with Grid2 container
    const gridContainerRegex = /<Grid\s+container/g;
    if (content.match(gridContainerRegex)) {
      content = content.replace(gridContainerRegex, '<Grid2 container');
      modified = true;
    }

    // Replace Grid item patterns with Grid2 size patterns
    const gridItemRegex = /<Grid\s+item\s+([^>]*?)>/g;
    content = content.replace(gridItemRegex, (match, attributes) => {
      // Extract size attributes
      const xsMatch = attributes.match(/xs=\{([^}]+)\}/);
      const smMatch = attributes.match(/sm=\{([^}]+)\}/);
      const mdMatch = attributes.match(/md=\{([^}]+)\}/);
      const lgMatch = attributes.match(/lg=\{([^}]+)\}/);
      const xlMatch = attributes.match(/xl=\{([^}]+)\}/);
      
      // Build size object
      let sizeObj = {};
      if (xsMatch) sizeObj.xs = xsMatch[1];
      if (smMatch) sizeObj.sm = smMatch[1];
      if (mdMatch) sizeObj.md = mdMatch[1];
      if (lgMatch) sizeObj.lg = lgMatch[1];
      if (xlMatch) sizeObj.xl = xlMatch[1];
      
      // Remove size attributes from original attributes
      let cleanAttributes = attributes
        .replace(/xs=\{[^}]+\}/g, '')
        .replace(/sm=\{[^}]+\}/g, '')
        .replace(/md=\{[^}]+\}/g, '')
        .replace(/lg=\{[^}]+\}/g, '')
        .replace(/xl=\{[^}]+\}/g, '')
        .trim();
      
      // Create size prop
      let sizeProp = '';
      if (Object.keys(sizeObj).length > 0) {
        if (Object.keys(sizeObj).length === 1 && sizeObj.xs) {
          sizeProp = `size={${sizeObj.xs}}`;
        } else {
          const sizeStr = Object.keys(sizeObj)
            .map(key => `${key}: ${sizeObj[key]}`)
            .join(', ');
          sizeProp = `size={{ ${sizeStr} }}`;
        }
      }
      
      // Combine attributes
      const allAttributes = [sizeProp, cleanAttributes].filter(Boolean).join(' ');
      
      modified = true;
      return `<Grid2${allAttributes ? ' ' + allAttributes : ''}>`;
    });

    // Replace closing Grid tags
    const closingGridRegex = /<\/Grid>/g;
    if (content.match(closingGridRegex)) {
      content = content.replace(closingGridRegex, '</Grid2>');
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.basename(filePath)}`);
      return true;
    } else {
      console.log(`⚪ No changes needed: ${path.basename(filePath)}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Process all files
console.log('Starting Grid to Grid2 conversion...\n');
let totalFiles = 0;
let modifiedFiles = 0;

for (const filePath of filesWithGrid) {
  totalFiles++;
  if (fixGridInFile(filePath)) {
    modifiedFiles++;
  }
}

console.log(`\n✨ Conversion complete!`);
console.log(`📁 Total files processed: ${totalFiles}`);
console.log(`🔧 Files modified: ${modifiedFiles}`);
console.log(`✅ Files unchanged: ${totalFiles - modifiedFiles}`);