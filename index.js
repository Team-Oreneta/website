const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const { read } = require('fs');
const marked = require('marked');

// Markdown renderer
const markdownRenderer = (markdown) => marked.parse(markdown);

// Directory paths
const srcDir = path.join(__dirname, 'src');
const templatesDir = path.join(srcDir, 'templates');
const outputDir = path.join(__dirname, 'dist');
const staticDir = 'static';
const outputStaticDir = '/dist/static';
const blogDir = '/blog/';

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
        } else {
            const data = fs.readFileSync(filePath, 'utf8');
            pages.push({
                name: file.replace(path.extname(file), ''),
                cleanPath: filePath.replace(pagesDir, '').replace(path.extname(file), '.html').replace(/\\/g, '/'),
                baseDir: filePath.replace(pagesDir, '').replace(file, ''),
                filename: file.replace(path.extname(file), '.html'),
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

function renderBlogIndex() {
    const dir = path.join(pagesDir, 'blog');
    const files = fs.readdirSync(dir);
    let posts = [];
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            posts = posts.concat(readBlogPosts(filePath));
        } else if (file.endsWith('.md')) {
            const data = fs.readFileSync(filePath, 'utf8');
            const lines = data.split('\n');
            let title;
            let description;
            let author;
            let body;
            let inFrontMatter = false;

            lines.forEach(line => {
                if (line.startsWith('---')) {
                    inFrontMatter = !inFrontMatter;
                } else if (inFrontMatter) {
                    if (line.startsWith('title:')) {
                        title = line.replace('title:', '').trim();
                    } else if (line.startsWith('description:')) {
                        description = line.replace('description:', '').trim();
                    } else if (line.startsWith('author:')) {
                        author = line.replace('author:', '').trim();
                    }
                } else {
                    body += line + '\n';
                }
            });

            posts.push({
                name: file.replace('.md', ''),
                cleanPath: filePath.replace(pagesDir, '').replace('.md', '.html').replace(/\\/g, '/'),
                filename: file.replace('.md', '.html'),
                path: filePath,
                body: body.trim(),
                title: title,
                description: description,
                author: author,
                creationDate: stats.birthtime,
                lastModifiedDate: stats.mtime,
                directory: false
            });
        }
    });
    var arguments = { static: outputStaticDir, body: null, title: "Team Oreneta's Blog", description: "Team Oreneta's Blog!", posts: posts };
    fs.ensureDirSync(path.dirname(path.join(outputDir, blogDir, 'index.html')));
    ejs.renderFile(path.join(templatesDir, 'blog.ejs'), arguments, (err, str) => {
        if (err) {
            console.error(`Error rendering blog.ejs:`, err);
            return;
        }
        ejs.renderFile(path.join(templatesDir, "base.ejs"), { static: outputStaticDir, body: str, title: "Team Oreneta's Blog", description: "Team Oreneta's Blog!"}, (err, str) => {
            if (err) {
                console.error(`Error rendering base.ejs:`, err);
                return;
            }
            fs.writeFileSync(path.join(outputDir, blogDir, 'index.html'), str);
        });
        console.log(`Created: ${path.join(blogDir, 'index.html')}`);
    });
}

function renderPage(page) {
    const templatePath = path.join(templatesDir, "base.ejs");
    const outputPath = path.join(outputDir, page.cleanPath);
    var arguments = { static: outputStaticDir, body: null, title: page.name, description: "We make cool stuff!" };
    arguments.body = ejs.render(page.body, arguments);
    if (page.path.endsWith('.md')) {
        const lines = page.body.split('\n');
        let inFrontMatter = false;
        let body = '';

        let title, description, author;
        lines.forEach(line => {
            if (line.startsWith('---')) {
            inFrontMatter = !inFrontMatter;
            } else if (inFrontMatter) {
            if (line.startsWith('title:')) {
                title = line.replace('title:', '').trim();
            } else if (line.startsWith('description:')) {
                description = line.replace('description:', '').trim();
            } else if (line.startsWith('author:')) {
                author = line.replace('author:', '').trim();
            }
            } else {
            body += line + '\n';
            }
        });
        arguments.title = title || page.name;
        arguments.description = description || "We make cool stuff!";
        arguments.author = author || "Unknown";
        let cleanBody = markdownRenderer(body.trim());
        arguments.body = ejs.render(fs.readFileSync(path.join(templatesDir, "blogPost.ejs"), 'utf8'), { static: outputStaticDir, content: cleanBody, title: title, description: description, author: author, creationDate: page.creationDate, lastModifiedDate: page.lastModifiedDate });
    }
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
        console.log(`Created: ${page.cleanPath}`);
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
    if (page.baseDir != blogDir) {
        renderPage(page);
    } else if (page.path == path.join(pagesDir, 'blog', 'index.ejs')) {
        renderBlogIndex();
    } else {
        renderPage(page);
    }
});

// Copy static files
const staticSrcDir = path.join(srcDir, staticDir);
if (fs.existsSync(staticSrcDir)) {
    fs.copySync(staticSrcDir, path.join(outputDir, staticDir));
} else {
    console.warn(`Static directory not found: ${staticSrcDir}`);
}