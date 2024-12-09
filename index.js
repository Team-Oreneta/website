const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');

// Directory paths
const srcDir = path.join(__dirname, 'src');
const cleanSrcDir = path.join('src');
const templatesDir = path.join(srcDir, 'templates');
const outputDir = path.join(__dirname, 'dist');
const staticDir = 'static';

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

const pagesDir = path.join(srcDir, 'pages');
const pages = fs.readdirSync(pagesDir).map(file => {
    const filePath = path.join(pagesDir, file);
    const data = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    return {
        name: file.replace('.ejs', ''),
        filename: file.replace('.ejs', '.html'),
        body: data,
        creationDate: stats.birthtime,
        lastModifiedDate: stats.mtime
    };
});

// Render pages
if (pages.length === 0) {
    console.error('No pages found');
    return;
}

pages.forEach(page => {
    const templatePath = path.join(templatesDir, "base.ejs");
    const outputPath = path.join(outputDir, page.filename);
    var arguments = { static: staticDir, body: null, title: page.name, description: "We make cool stuff!" };
    arguments.body = ejs.render(page.body, arguments);
    ejs.renderFile(templatePath, arguments, (err, str) => {
        if (err) {
            console.error(`Error rendering ${templatePath}:`, err);
            return;
        }

        fs.writeFileSync(outputPath, str);
        console.log(`Generated ${outputPath}`);
    });
});

// Copy static files
fs.copySync(staticDir, path.join(outputDir, 'static'));