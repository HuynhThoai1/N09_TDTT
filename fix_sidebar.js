const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'Sidebar.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');

// We know the old sidebar starts around line 426 and ends at line 1086.
// Let's find the exact indices by looking for the specific markers.

const startIndex = lines.findIndex((line, idx) => line.includes('<aside') && lines[idx+1].includes('className={`fixed top-0 left-0 h-full bg-slate-950/80 backdrop-blur-xl'));
// Find the next </aside> after startIndex
let endIndex = -1;
for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].includes('</aside>')) {
        endIndex = i;
        break;
    }
}

if (startIndex !== -1 && endIndex !== -1) {
    // Delete lines from startIndex to endIndex
    lines.splice(startIndex, endIndex - startIndex + 1);
    
    // Check for any empty lines left behind and remove them
    if (lines[startIndex] && lines[startIndex].trim() === '') {
        lines.splice(startIndex, 1);
    }

    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log("Đã xóa Sidebar cũ thành công! (Khoảng 660 dòng đã được dọn dẹp)");
} else {
    console.log("Không tìm thấy block Sidebar cũ, có thể đã được xóa rồi.");
}
