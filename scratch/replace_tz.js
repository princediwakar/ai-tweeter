const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            if (f !== 'node_modules' && f !== '.next' && f !== '.git' && f !== 'scratch' && f !== 'docs') {
                walk(dirPath, callback);
            }
        } else {
            if (dirPath.endsWith('.ts') || dirPath.endsWith('.tsx') || dirPath.endsWith('.js')) {
                callback(dirPath);
            }
        }
    });
}

walk('.', (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // Replace SQL COALESCE statements
    content = content.replace(/COALESCE\(s\.timezone, 'UTC'\)/g, "COALESCE(s.timezone, 'Asia/Kolkata')");
    content = content.replace(/COALESCE\(timezone, 'UTC'\)/g, "COALESCE(timezone, 'Asia/Kolkata')");
    
    // app/api/onboarding/complete/route.ts specific
    content = content.replace(/brandProfileId, 'UTC', true,/g, "brandProfileId, 'Asia/Kolkata', true,");
    
    // lib/scheduleService.ts specific
    content = content.replace(/input\.timezone \|\| 'UTC'/g, "input.timezone || 'Asia/Kolkata'");
    
    // app/posts/page.tsx specific
    content = content.replace(/schedule\.timezone \|\| 'UTC'/g, "schedule.timezone || 'Asia/Kolkata'");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated', filePath);
    }
});
