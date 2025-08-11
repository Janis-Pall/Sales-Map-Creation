# 🌍 Company Delivery Map Creation

**Interactive Global Supply Chain Visualization Tool**

A powerful, web-based mapping application for visualizing delivery networks, supply chains, and global business connections. Perfect for logistics companies, presentations, and supply chain analysis.

![Delivery Map Preview](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow)
![Leaflet](https://img.shields.io/badge/Maps-Leaflet.js-green)
![No Dependencies](https://img.shields.io/badge/Dependencies-Minimal-blue)

## ✨ Features

### 🎯 Core Functionality
- **Interactive World Map** with smooth zoom and pan
- **Origin & Destination Mapping** with curved connection lines
- **Smart Country Labels** with zoom-based abbreviation switching
- **Regional Quick Selection** (Europe, Asia, Americas, Africa, Oceania, World)
- **Persistent Settings** - remembers your preferences across sessions

### 📊 Visualization Options
- **Dynamic Country Labels** - Auto-switch between abbreviations (DE) and full names (Germany)
- **Connection Lines** - Curved delivery routes from origin to destinations
- **Zoom-Responsive UI** - Labels adapt to current zoom level
- **Clean Map Interface** - Professional appearance for business use

### 🎬 Presentation Mode
- **Full-Screen Animated Presentations** - Countries appear step-by-step
- **Customizable Animation Speed** - Slow (3s), Medium (2s), Fast (1s)
- **Multiple Ordering Options** - Alphabetical, Distance, or Regional
- **Professional Presentation Tool** - Perfect for business meetings

### 💾 Export & Sharing
- **Save as PDF** - High-quality map exports
- **Save as JPG** - Web-ready image format
- **Print Support** - Optimized for printing
- **Full-Screen Mode** - Distraction-free viewing

### ⚙️ Advanced Settings
- **Configurable Zoom Thresholds** - Customize when labels switch to full names
- **Label Management** - Show/hide and reorganize country labels
- **Persistent Origin Country** - Automatically remembered between sessions
- **Responsive Design** - Works on desktop and mobile devices

## 🚀 Quick Start

### Option 1: Direct Download
1. **Download** or clone this repository
2. **Open** `index.html` in any modern web browser
3. **Select** your origin country (will be remembered)
4. **Add destinations** via search, checkboxes, or region buttons
5. **Visualize** your supply chain network!

### Option 2: GitHub Pages (Recommended)
1. **Fork** this repository
2. **Enable GitHub Pages** in repository settings
3. **Access** your live map at `https://yourusername.github.io/delivery-map`

## 📋 How to Use

### Getting Started
1. **Select Origin Country** - Choose your headquarters/origin point
2. **Choose Destinations** - Use search, manual selection, or region buttons
3. **Add to Map** - Click "Add Selected Countries" to visualize connections
4. **Customize View** - Adjust labels, zoom, and presentation settings

### Presentation Mode
1. **Click "Presentation Mode"** button
2. **Configure settings** - animation speed, order, effects
3. **Start presentation** - Full-screen animated visualization
4. **Control playback** - Pause/resume or exit anytime

### Export Options
- **PDF Export** - Professional quality for reports
- **JPG Export** - Web-ready images for presentations
- **Print Function** - Optimized layouts for printing

## 🛠️ Technical Details

### Built With
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Mapping**: Leaflet.js with OpenStreetMap
- **Export**: jsPDF, html2canvas
- **Icons**: Font Awesome
- **No Backend Required** - Pure client-side application

### Browser Compatibility
- ✅ Chrome (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers

### File Structure
```
delivery-map/
├── index.html          # Main application file
├── script.js           # Core application logic
├── style.css           # Styling and responsive design
├── README.md           # Documentation
└── start.bat           # Windows quick-start script
```

## 🎨 Customization

### Modify Countries and Regions
Edit the `COUNTRY_DATA` and `COUNTRY_REGIONS` objects in `script.js` to add/modify countries.

### Change Map Styling
Update `style.css` to customize colors, fonts, and layout.

### Add New Features
The modular JavaScript structure makes it easy to extend functionality.

## 📱 Use Cases

### Business Applications
- **Supply Chain Visualization** - Map your global supply network
- **Logistics Planning** - Visualize delivery routes and hubs
- **Market Expansion** - Plan and present new market entries
- **Sales Territories** - Display regional sales coverage

### Educational & Research
- **Geographic Education** - Interactive country learning
- **Trade Route Analysis** - Historical and modern trade patterns
- **Global Studies** - Visualize international relationships

### Presentations
- **Board Meetings** - Professional supply chain presentations
- **Client Presentations** - Showcase global reach
- **Sales Pitches** - Demonstrate market coverage
- **Academic Presentations** - Interactive geographic content

## 🔧 Configuration

### Settings Panel
Access via the Settings section in the left panel:

- **Full Name Zoom Threshold**: Customize when country labels switch from abbreviations to full names
- **Default**: 4.25 (below = abbreviations, above = full names)
- **Range**: 1.0 - 10.0

### Persistent Settings
The following settings are automatically saved:
- Origin country selection
- Zoom threshold preference
- Label visibility state

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Areas for Contribution
- 🌐 Additional country data
- 🎨 UI/UX improvements
- 📊 New visualization options
- 🐛 Bug fixes and optimizations
- 📚 Documentation improvements

## 📄 License

This project is licensed under the MIT License - see below for details:

```
MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## 🐛 Troubleshooting

### Common Issues

**Labels not updating?**
- Toggle "Show Names" off and on
- Try clicking "Reorganize Names"

**Export not working?**
- Allow downloads/popups in your browser
- Try a different browser
- Check browser console for errors

**Map not loading?**
- Check internet connection
- Ensure browser supports modern JavaScript
- Clear browser cache and reload

**Performance issues?**
- Reduce number of selected countries
- Close other browser tabs
- Try on a faster device

### Browser Requirements
- JavaScript enabled
- Modern browser (2020+)
- Internet connection for map tiles
- Local storage support (for settings)

## 📞 Support

- **Issues**: Open a GitHub issue for bugs or feature requests
- **Questions**: Use GitHub Discussions for general questions
- **Security**: Email security issues privately

## 🏆 Acknowledgments

- **Leaflet.js** - Excellent mapping library
- **OpenStreetMap** - Free and open map data
- **Font Awesome** - Beautiful icons
- **Contributors** - Everyone who helped improve this project

---

**⭐ Star this repository if you find it useful!**

**🚀 Ready to visualize your global network? [Get Started](#-quick-start) now!**