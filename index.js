const fs = require('fs-extra');
const path = require('path');
const showdown = require('showdown');
const ejs = require('ejs');

const mdProcessor = new showdown.Converter({
    tables: true,
    ghCompatibleHeaderId: true,
    simplifiedAutoLink: true,
    strikethrough: true,
    tasklists: true,
    metadata: true,
});

const srcDir = path.join(__dirname, 'src');
const srcStaticDir = path.join(srcDir, 'static');
const distDir = path.join(__dirname, 'dist');
const distStaticDir = path.join(distDir, 'static');
const contentDir = path.join(srcDir, 'pages');
const outputStaticDir = '/static';
const templateDir = path.join(srcDir, 'templates');

function dirWalker(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(dirWalker(file));
        } else {
            if (path.extname(file) === '.md') {
                const body = mdProcessor.makeHtml(fs.readFileSync(file, 'utf8'));
                return results.push({
                    file: file,
                    cleanPath: file.replace(contentDir, ''),
                    targetFileName: file.replace(contentDir, '').replace(/\\/g, '/').replace('.md', '.html'),
                    baseDir: path.dirname(file).replace(contentDir, ''),
                    createdAt: stat.birthtime,
                    modifiedAt: stat.mtime,
                    body: body || '',
                    metadata: mdProcessor.getMetadata(), // Placeholder for metadata extraction
                    isMarkdown: true,
                });
            }
            results.push({
                file: file,
                targetFileName: file.replace(contentDir, '').replace('.ejs', '.html').replace('.md', '.html'),
                cleanPath: file.replace(contentDir, ''),
                baseDir: path.dirname(file).replace(contentDir, ''),
                createdAt: stat.birthtime,
                modifiedAt: stat.mtime,
                isMarkdown: false,
            });
        }
    });
    return results;
}

console.log('Reading content directory...');
const files = dirWalker(contentDir);
console.log('Content directory read.');


var projectPosts = files.filter(function(file) {
    return file.cleanPath.includes(path.normalize('/projects/')) && !file.cleanPath.includes('index.ejs');
});

var blogPosts = files.filter(function(file) {
    return file.cleanPath.includes(path.normalize('/blog/')) && !file.cleanPath.includes('index.ejs');
});

function renderProjectIndex() {
    const destDir = path.join(distDir, 'projects', 'index.html');
    fs.ensureDirSync(path.join(distDir, 'projects'));
    const templateData = { static: outputStaticDir, body: null, title: "Team Oreneta's Projects", description: "A list of our cool stuff!", posts: projectPosts };
    const baseTemplate = fs.readFileSync(path.join(templateDir, 'base.ejs'), 'utf8');
    const projectTemplate = fs.readFileSync(path.join(templateDir, 'blog.ejs'), 'utf8');
    const projectHtml = ejs.render(projectTemplate, templateData);
    const renderedHtml = ejs.render(baseTemplate, { body: projectHtml, title: "Team Oreneta Projects", description: "A list of our cool stuff!", static: outputStaticDir });
    fs.writeFileSync(destDir, renderedHtml);
}

function renderBlogIndex() {
    const destDir = path.join(distDir, 'blog', 'index.html');
    fs.ensureDirSync(path.join(distDir, 'blog'));
    const templateData = { static: outputStaticDir, body: null, title: "Team Oreneta's Blog", description: "Our very own Blog!", posts: blogPosts };
    const baseTemplate = fs.readFileSync(path.join(templateDir, 'base.ejs'), 'utf8');
    const projectTemplate = fs.readFileSync(path.join(templateDir, 'blog.ejs'), 'utf8');
    const projectHtml = ejs.render(projectTemplate, templateData);
    const renderedHtml = ejs.render(baseTemplate, { body: projectHtml, title: "Team Oreneta's Blog", description: "Our very own Blog!", static: outputStaticDir });
    fs.writeFileSync(destDir, renderedHtml);
}

const indexTemplate = fs.readFileSync(path.join(srcDir, 'pages', 'index.ejs'), 'utf8');
const baseTemplate = fs.readFileSync(path.join(templateDir, 'base.ejs'), 'utf8');
const indexHtml = ejs.render(indexTemplate, { static: outputStaticDir, title: "Team Oreneta", description: "We make cool stuff!" });
const renderedHtml = ejs.render(baseTemplate, { body: indexHtml, title: "Team Oreneta", description: "We make cool stuff!", static: outputStaticDir });
fs.writeFileSync(path.join(distDir, 'index.html'), renderedHtml);

renderBlogIndex();
renderProjectIndex();

// Copy static files;
if (fs.existsSync(distStaticDir)) {
    fs.copySync(srcStaticDir, distStaticDir);
} else {
    console.warn(`Static directory not found: ${distStaticDir}`);
}