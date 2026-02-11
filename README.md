# Personal Portfolio Website

A modern, responsive multi-page portfolio website built with HTML, CSS, and JavaScript.

## Features

- **Multi-Page Design**: Separate pages for easy navigation
  - **Homepage**: Profile picture, name, about preview, and clickable section cards
  - **About Page**: Detailed biography, experience timeline, and stats
  - **Skills Page**: Technology showcase with proficiency levels
  - **Projects Page**: Filterable project gallery
  - **Contact Page**: Contact form and social links
- **Responsive Design**: Fully responsive layout that works on all devices
- **Modern UI**: Clean design with purple gradient theme and smooth animations
- **Interactive Elements**:
  - Sticky navbar with page-specific active states
  - Clickable preview cards that redirect to dedicated pages
  - Project filtering system
  - Scroll-triggered animations
  - Animated proficiency bars
- **Mobile-Friendly**: Hamburger menu for mobile devices

## Technologies Used

- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript
- Font Awesome Icons

## Getting Started

### Local Development

1. Clone this repository:
```bash
git clone <repository-url>
```

2. Open `index.html` in your web browser, or use a local server:
```bash
python -m http.server 8000
# or
npx serve
```

3. Visit `http://localhost:8000` in your browser

## Deployment

This portfolio can be deployed to various hosting platforms:

### Option 1: Netlify (Recommended)

1. Push your code to GitHub
2. Go to [Netlify](https://www.netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your GitHub repository
5. Click "Deploy site"

**Or use Netlify CLI:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Option 2: Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Click "Deploy"

**Or use Vercel CLI:**
```bash
npm install -g vercel
vercel --prod
```

### Option 3: GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings → Pages
3. Select the branch you want to deploy
4. Click "Save"
5. Your site will be available at `https://yourusername.github.io/repository-name`

### Option 4: Simple Static Hosting

Upload all files to any static web hosting service:
- AWS S3 + CloudFront
- Firebase Hosting
- Cloudflare Pages
- Render

## Customization

### Personal Information

Edit `index.html` to update:
- Your name in the hero section
- About section content
- Skills and technologies
- Project details
- Contact information
- Social media links

### Styling

Modify `styles.css` to customize:
- Color scheme (CSS variables in `:root`)
- Fonts
- Layout and spacing
- Animations

### Functionality

Update `script.js` to:
- Add form backend integration
- Modify animations
- Add additional interactive features

## Project Structure

```
portfolio/
├── index.html          # Main HTML file
├── styles.css          # All styles and responsive design
├── script.js           # JavaScript functionality
└── README.md           # Project documentation
```

## Color Scheme

The portfolio uses a modern purple gradient theme:
- Primary: #6366f1
- Secondary: #8b5cf6
- Dark Background: #0f172a
- Light Background: #f8fafc

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Enhancements

- [ ] Add blog section
- [ ] Integrate with a backend for contact form
- [ ] Add dark mode toggle
- [ ] Include actual project images
- [ ] Add testimonials section
- [ ] Implement i18n for multiple languages

## License

This project is open source and available under the MIT License.

## Contact

Feel free to reach out for any questions or collaborations!
