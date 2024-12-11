const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const { read } = require('fs');

// Directory paths
const srcDir = path.join(__dirname, 'src');
const templatesDir = path.join(srcDir, 'templates');
const outputDir = path.join(__dirname, 'dist');
const staticDir = 'static';
const outputStaticDir = '/static';
// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
    fs.mkdirSync(path.join(outputDir, staticDir));
}

function readDir(dir) {
    const files = fs.readdirSync(dir);
    let pages = [];
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath
        );
        if (stats.isDirectory()) {
            pages = pages.concat(readDir(filePath));
        } else if (file.endsWith('.ejs')) {
            const data = fs.readFileSync(filePath, 'utf8');
            pages.push({
                name: file.replace('.ejs', ''),
                cleanPath: filePath.replace(pagesDir, '').replace('.ejs', '.html').replace(/\\/g, '/'),
                filename: file.replace('.ejs', '.html'),
                path: filePath,
                body: data,
                creationDate: stats.birthtime,
                lastModifiedDate: stats.mtime,
                directory: false
            });
        }
    });
    return pages;
}

function renderPage(page) {
    const templatePath = path.join(templatesDir, "base.ejs");
    const outputPath = path.join(outputDir, page.cleanPath);
    var arguments = { static: outputStaticDir, body: null, title: page.name, description: "We make cool stuff!" };
    arguments.body = ejs.render(page.body, arguments);
    fs.ensureDirSync(path.dirname(outputPath));
    ejs.renderFile(templatePath, arguments, (err, str) => {
        if (err) {
            console.error(`Error rendering ${templatePath}:`, err);
            return;
        }
        if (!fs.existsSync(path.dirname(outputPath))) {
            fs.mkdirSync(path.dirname(page.path), { recursive: true });
        }
        fs.writeFileSync(outputPath, str);
        console.log(`\tCreated: ${page.cleanPath}`);
    });
}

const pagesDir = path.join(srcDir, 'pages');
const pages = readDir(pagesDir);

// Render pages
if (pages.length === 0) {
    console.error('No pages found');
    return;
}

pages.forEach(page => {
    renderPage(page);
});

// Copy static files
const staticSrcDir = path.join(srcDir, staticDir);
if (fs.existsSync(staticSrcDir)) {
    fs.copySync(staticSrcDir, path.join(outputDir, staticDir));
} else {
    console.warn(`Static directory not found: ${staticSrcDir}`);
}