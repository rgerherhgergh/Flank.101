const DISCORD_USER_ID = '1400917606528974868';
const LANYARD_WS_URL = 'wss://api.lanyard.rest/socket';

let socket = null;
let heartbeatInterval = null;
let spotifyUpdateInterval = null;
let mouseX = 0;
let mouseY = 0;
let cursorX = 0;
let cursorY = 0;
let trailX = 0;
let trailY = 0;

document.addEventListener('DOMContentLoaded', function() {
    initCustomCursor();
    connectToLanyard();
    initSmoothScroll();
    initContactCopy();
    initScrollAnimations();
    initContactParticles();
    initTypingAnimation();
    initSkillPages();
});

function initCustomCursor() {
    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursor-trail');
    const interactiveElements = document.querySelectorAll('a, button, .nav-link, .contact-item, .skill-item, .profile-card, .spotify-card');
    
    document.body.style.fontFamily = "'Inter', sans-serif";
    
    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });
    
    function animateCursor() {
        const dx = mouseX - cursorX;
        const dy = mouseY - cursorY;
        const trailDx = cursorX - trailX;
        const trailDy = cursorY - trailY;
        
        cursorX += dx * 0.2;
        cursorY += dy * 0.2;
        trailX += trailDx * 0.1;
        trailY += trailDy * 0.1;
        
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
        trail.style.left = trailX + 'px';
        trail.style.top = trailY + 'px';
        
        requestAnimationFrame(animateCursor);
    }
    animateCursor();
    
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => {
            cursor.classList.add('hover');
        });
        
        el.addEventListener('mouseleave', () => {
            cursor.classList.remove('hover');
        });
    });
    
    document.addEventListener('mousedown', () => {
        cursor.classList.add('click');
    });
    
    document.addEventListener('mouseup', () => {
        cursor.classList.remove('click');
    });
}

function connectToLanyard() {
    socket = new WebSocket(LANYARD_WS_URL);
    
    socket.onopen = function() {
        console.log('Connected to Lanyard');
        
        socket.send(JSON.stringify({
            op: 2,
            d: {
                subscribe_to_id: DISCORD_USER_ID
            }
        }));
    };
    
    socket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        
        switch(data.op) {
            case 1: 
                startHeartbeat(data.d.heartbeat_interval);
                break;
                
            case 0:
                if (data.t === 'INIT_STATE' || data.t === 'PRESENCE_UPDATE') {
                    updateDiscordStatus(data.d);
                }
                break;
        }
    };
    
    socket.onclose = function() {
        console.log('Lanyard connection closed, reconnecting...');
        setTimeout(connectToLanyard, 5000);
    };
    
    socket.onerror = function(error) {
        console.error('Lanyard error:', error);
    };
}

function startHeartbeat(interval) {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
    }
    
    heartbeatInterval = setInterval(() => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ op: 3 }));
        }
    }, interval);
}

function updateDiscordStatus(data) {
    const user = data[DISCORD_USER_ID] || data;
    
    if (!user) return;
    
    const avatar = document.getElementById('discord-avatar');
    if (user.discord_user && user.discord_user.avatar) {
        const avatarUrl = `https://cdn.discordapp.com/avatars/${user.discord_user.id}/${user.discord_user.avatar}.png?size=256`;
        
        avatar.style.opacity = '0';
        avatar.style.transform = 'scale(0.8)';
        setTimeout(() => {
            avatar.src = avatarUrl;
            avatar.style.opacity = '1';
            avatar.style.transform = 'scale(1)';
        }, 200);
    }
    
    const username = document.getElementById('discord-username');
    if (user.discord_user) {
        username.style.opacity = '0';
        setTimeout(() => {
            username.textContent = user.discord_user.global_name || user.discord_user.username;
            username.style.opacity = '1';
        }, 100);
    }
    
    const statusDot = document.getElementById('discord-status-dot');
    const statusText = document.getElementById('discord-status-text');
    
    statusDot.className = 'status-dot';
    
    statusText.style.opacity = '0';
    statusDot.style.transform = 'scale(0)';
    
    setTimeout(() => {
        switch(user.discord_status) {
            case 'online':
                statusDot.classList.add('online');
                statusText.textContent = 'Online';
                break;
            case 'idle':
                statusDot.classList.add('idle');
                statusText.textContent = 'Away';
                break;
            case 'dnd':
                statusDot.classList.add('dnd');
                statusText.textContent = 'Do Not Disturb';
                break;
            default:
                statusDot.classList.add('offline');
                statusText.textContent = 'Offline';
        }
        
        statusText.style.opacity = '1';
        statusDot.style.transform = 'scale(1)';
    }, 150);
    
    updateDiscordActivity(user.activities);
    
    updateSpotifyStatus(user.spotify);
}

function updateDiscordActivity(activities) {
    const activityContainer = document.getElementById('discord-activity');
    
    if (!activities || activities.length === 0) {
        activityContainer.style.opacity = '0';
        activityContainer.style.transform = 'translateY(-20px) scale(0.9)';
        activityContainer.style.filter = 'blur(5px)';
        setTimeout(() => {
            activityContainer.style.display = 'none';
        }, 400);
        return;
    }
    
    let activity = activities.find(a => a.type === 1); 
    if (!activity) activity = activities.find(a => a.type === 0); 
    if (!activity) activity = activities.find(a => a.type === 3); 
    if (!activity) activity = activities.find(a => a.type !== 2 && a.type !== 4);
    
    if (!activity) {
        activityContainer.style.display = 'block';
        
        const activityIcon = document.getElementById('activity-icon');
        const activityName = document.getElementById('activity-name');
        const activityState = document.getElementById('activity-state');
        
        const existingIndicator = activityContainer.querySelector('.activity-type-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        const existingCustomStatus = activityContainer.querySelector('.custom-status');
        if (existingCustomStatus) existingCustomStatus.remove();
        
        activityContainer.style.opacity = '0';
        activityContainer.style.transform = 'translateY(40px) scale(0.8)';
        activityContainer.style.filter = 'blur(10px)';
        
        setTimeout(() => {
            activityName.textContent = 'No Activity';
            activityState.textContent = 'Currently not doing anything';
            
            activityIcon.style.display = 'none';
            
            activityContainer.style.opacity = '1';
            activityContainer.style.transform = 'translateY(0) scale(1)';
            activityContainer.style.filter = 'blur(0px)';
        }, 200);
        
        return;
    }
    
    activityContainer.classList.add('loading');
    activityContainer.style.display = 'block';
    
    const activityIcon = document.getElementById('activity-icon');
    const activityName = document.getElementById('activity-name');
    const activityState = document.getElementById('activity-state');
    
    const existingIndicator = activityContainer.querySelector('.activity-type-indicator');
    if (existingIndicator) existingIndicator.remove();
    
    const existingCustomStatus = activityContainer.querySelector('.custom-status');
    if (existingCustomStatus) existingCustomStatus.remove();
    
    activityContainer.style.opacity = '0';
    activityContainer.style.transform = 'translateY(40px) scale(0.8)';
    activityContainer.style.filter = 'blur(10px)';
    
    setTimeout(() => {
        activityContainer.classList.remove('loading');
        
        const typeIndicator = document.createElement('div');
        typeIndicator.className = 'activity-type-indicator';
        
        switch(activity.type) {
            case 0: typeIndicator.classList.add('activity-type-game'); break;
            case 1: typeIndicator.classList.add('activity-type-streaming'); break;
            case 3: typeIndicator.classList.add('activity-type-watching'); break;
            default: typeIndicator.classList.add('activity-type-game'); break;
        }
        
        activityContainer.appendChild(typeIndicator);
        
        activityName.textContent = activity.name || 'Discord Activity';
        
        let stateText = '';
        if (activity.details && activity.state) {
            stateText = `${activity.details} • ${activity.state}`;
        } else if (activity.details) {
            stateText = activity.details;
        } else if (activity.state) {
            stateText = activity.state;
        } else {
            stateText = getActivityTypeText(activity.type);
        }
        
        activityState.textContent = stateText;
        
        if (activity.assets && activity.assets.large_image) {
            let iconUrl;
            if (activity.assets.large_image.startsWith('mp:')) {
                iconUrl = `https://media.discordapp.net/${activity.assets.large_image.slice(3)}`;
            } else {
                iconUrl = `https://cdn.discordapp.com/app-assets/${activity.application_id}/${activity.assets.large_image}.png`;
            }
            
            activityIcon.style.opacity = '0';
            activityIcon.style.transform = 'scale(0.3) rotate(180deg)';
            activityIcon.style.filter = 'blur(5px)';
            activityIcon.src = iconUrl;
            activityIcon.style.display = 'block';
            
            setTimeout(() => {
                activityIcon.style.opacity = '1';
                activityIcon.style.transform = 'scale(1) rotate(0deg)';
                activityIcon.style.filter = 'blur(0px)';
            }, 300);
        } else {
            activityIcon.style.opacity = '0';
            activityIcon.style.transform = 'scale(0.3)';
            activityIcon.style.filter = 'blur(5px)';
            activityIcon.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2ZmZmZmZiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5LjI3IDUuMzNDMTcuOTQgNC43MSAxNi41IDQuMjYgMTUgNGEuMDkuMDkgMCAwIDAtLjA3LjAzYy0uMTguMzMtLjM5Ljc2LS41MyAxLjA5YTE2LjA5IDE2LjA5IDAgMCAwLTQuOCAwYy0uMTQtLjM0LS4zNS0uNzYtLjU0LTEuMDljLS4wMS0uMDItLjA0LS4wMy0uMDctLjAzYy0xLjUuMjYtMi45My43MS00LjI3IDEuMzNjLS4wMSAwLS4wMi4wMS0uMDMuMDJjLTIuNzIgNC4wNy0zLjQ3IDguMDMtMy4xIDExLjk1YzAgLjAyLjAxLjA0LjAzLjA1YzEuOCAxLjMyIDMuNTMgMi4xMiA1LjI0IDIuNjVjLjAzLjAxLjA2IDAgLjA3LS4wMmMuNC0uNTUuNzYtMS4xMyAxLjA3LTEuNzRjLjAyLS4wNCAwLS4wOC0uMDQtLjA5Yy0uNTctLjIyLTEuMTEtLjQ4LTEuNjQtLjc4Yy0uMDQtLjAyLS4wNC0uMDgtLjAxLS4xMWMuMTEtLjA4LjIyLS4xNy4zMy0uMjVjLjAyLS4wMi4wNS0uMDIuMDctLjAxYzMuNDQgMS41NyA3LjE1IDEuNTcgMTAuNTUgMGMuMDItLjAxLjA1LS4wMS4wNy4wMWMuMTEuMDkuMjIuMTcuMzMuMjZjLjA0LjAzLjA0LjA5LS4wMS4xMWMtLjUyLjMxLTEuMDcuNTYtMS42NC43OGMtLjA0LjAxLS4wNS4wNi0uMDQuMDljLjMyLjYxLjY4IDEuMTkgMS4wNyAxLjc0Yy4wMy4wMS4wNi4wMi4wOS4wMWMxLjcyLS41MyAzLjQ1LTEuMzMgNS4yNS0yLjY1Yy4wMi0uMDEuMDMtLjAzLjAzLS4wNWMuNDQtNC41My0uNzMtOC40Ni0zLjEtMTEuOTVjLS4wMS0uMDEtLjAyLS4wMi0uMDQtLjAyek04LjUyIDE0LjkxYy0xLjAzIDAtMS44OS0uOTUtMS44OS0yLjEyczLuODQtMi4xMiAxLjg5LTIuMTJjMS4wNiAwIDEuOS45NiAxLjg5IDIuMTJjMCAxLjE3LS44NCAyLjEyLTEuODkgMi4xMnptNi45NyAwYy0xLjAzIDAtMS44OS0uOTUtMS44OS0yLjEyczLuODQtMi4xMiAxLjg5LTIuMTJjMS4wNiAwIDEuOS45NiAxLjg5IDIuMTJjMCAxLjE3LS44MyAyLjEyLTEuODkgMi4xMnoiLz4KPC9zdmc+';
            activityIcon.style.display = 'block';
            
            setTimeout(() => {
                activityIcon.style.opacity = '1';
                activityIcon.style.transform = 'scale(1)';
                activityIcon.style.filter = 'blur(0px)';
            }, 300);
        }
        
        activityContainer.style.opacity = '1';
        activityContainer.style.transform = 'translateY(0) scale(1)';
        activityContainer.style.filter = 'blur(0px)';
        
    }, 200);
}

function getActivityTypeText(type) {
    switch(type) {
        case 0: return 'Playing a game';
        case 1: return 'Streaming';
        case 2: return 'Listening to music';
        case 3: return 'Watching';
        case 5: return 'Competing';
        default: return 'Active';
    }
}

function updateSpotifyStatus(spotify) {
    const spotifyCard = document.getElementById('spotify-card');
    
    if (!spotify) {
        spotifyCard.style.display = 'none';
        return;
    }
    
    spotifyCard.style.display = 'block';
    
    const albumCover = document.getElementById('album-cover');
    const spotifyTitle = document.getElementById('spotify-title');
    const spotifyArtist = document.getElementById('spotify-artist');
    const progressFill = document.getElementById('progress-fill');
    const currentTime = document.getElementById('current-time');
    const totalTime = document.getElementById('total-time');
    
    albumCover.src = spotify.album_art_url;
    spotifyTitle.textContent = spotify.song;
    spotifyArtist.textContent = spotify.artist;
    
    const now = Date.now();
    const start = spotify.timestamps.start;
    const end = spotify.timestamps.end;
    const duration = end - start;
    const elapsed = now - start;
    const progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
    
    progressFill.style.width = progress + '%';
    
    currentTime.textContent = formatTime(elapsed);
    totalTime.textContent = formatTime(duration);
    
    if (spotifyUpdateInterval) {
        clearInterval(spotifyUpdateInterval);
    }
    
    spotifyUpdateInterval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - start;
        const progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
        
        progressFill.style.width = progress + '%';
        currentTime.textContent = formatTime(elapsed);
        
        if (progress >= 100) {
            clearInterval(spotifyUpdateInterval);
        }
    }, 1000);
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                
                smoothScrollTo(offsetTop, 1000);
            }
        });
    });
}

function smoothScrollTo(targetPosition, duration = 1200) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    let startTime = null;
    
    function easeOutQuint(t, b, c, d) {
        t /= d;
        t--;
        return c * (t * t * t * t * t + 1) + b;
    }
    
    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        
        const run = easeOutQuint(timeElapsed, startPosition, distance, duration);
        
        window.scrollTo({
            top: run,
            left: 0
        });
        
        if (progress < 1) {
            requestAnimationFrame(animation);
        }
    }
    
    requestAnimationFrame(animation);
}

function initSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                const rect = targetSection.getBoundingClientRect();
                const offsetTop = window.pageYOffset + rect.top - 80;
                
                const distance = Math.abs(offsetTop - window.pageYOffset);
                const duration = Math.min(1500, Math.max(800, distance * 0.5));
                
                smoothScrollTo(offsetTop, duration);
            }
        });
    });
}

document.addEventListener('keydown', function(e) {
    const scrollAmount = window.innerHeight * 0.75;
    
    switch(e.key) {
        case 'ArrowDown':
        case 'PageDown':
            e.preventDefault();
            smoothScrollTo(window.pageYOffset + scrollAmount, 1000);
            break;
        case 'ArrowUp':
        case 'PageUp':
            e.preventDefault();
            smoothScrollTo(window.pageYOffset - scrollAmount, 1000);
            break;
        case 'Home':
            e.preventDefault();
            smoothScrollTo(0, 1200);
            break;
        case 'End':
            e.preventDefault();
            smoothScrollTo(document.documentElement.scrollHeight, 1200);
            break;
    }
});

let wheelTimeout;
let isWheelScrolling = false;

document.addEventListener('wheel', function(e) {
    if (!isWheelScrolling) {
        document.documentElement.style.scrollBehavior = 'auto';
        isWheelScrolling = true;
    }
    
    clearTimeout(wheelTimeout);
    wheelTimeout = setTimeout(() => {
        isWheelScrolling = false;
    }, 100);
}, { passive: true });

function initContactCopy() {
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const platform = this.getAttribute('data-platform');
            let textToCopy = '';
            
            const originalText = this.querySelector('.contact-value').textContent;
            this.querySelector('.contact-value').textContent = 'Copied!';
            
            setTimeout(() => {
                this.querySelector('.contact-value').textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Error copying:', err);
        });
    });
}

const introOverlay = document.getElementById('introOverlay');
const audio = document.getElementById('background-audio');

introOverlay.addEventListener('click', () => {
  introOverlay.classList.add('hidden');
  audio.volume = 0.6;  // Facultatif : ajuste le volume
  audio.play();
});


function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
                
                if (entry.target.classList.contains('skill-category')) {
                    const skillItems = entry.target.querySelectorAll('.skill-item');
                    skillItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.animation = `fadeInUp 0.5s ease-out ${index * 0.1}s both`;
                        }, 200);
                    });
                }
                
                if (entry.target.classList.contains('contact-grid')) {
                    const contactItems = entry.target.querySelectorAll('.contact-item');
                    contactItems.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.transform = 'translateY(0) scale(1)';
                            item.style.opacity = '1';
                        }, index * 100);
                    });
                }
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.skill-category, .contact-grid, .discord-activity, .spotify-card').forEach(el => {
        observer.observe(el);
    });
}



function initContactParticles() {
    const contactItems = document.querySelectorAll('.contact-item');
    
    contactItems.forEach(item => {
        item.addEventListener('mouseenter', (e) => {
            createContactParticles(e.target);
        });
    });
}

function createContactParticles(element) {
    const rect = element.getBoundingClientRect();
    const particleCount = 6;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            width: 4px;
            height: 4px;
            background: rgba(255, 255, 255, 0.6);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
        `;
        
        document.body.appendChild(particle);
        
        const angle = (i / particleCount) * Math.PI * 2;
        const velocity = 50 + Math.random() * 30;
        const lifetime = 1000 + Math.random() * 500;
        
        particle.animate([
            {
                transform: 'translate(0, 0) scale(1)',
                opacity: 1
            },
            {
                transform: `translate(${Math.cos(angle) * velocity}px, ${Math.sin(angle) * velocity}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: lifetime,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => {
            particle.remove();
        };
    }
}

function initTypingAnimation() {
    const titles = document.querySelectorAll('.category-title');
    
    titles.forEach((title, index) => {
        const text = title.textContent;
        title.textContent = '';
        
        setTimeout(() => {
            let i = 0;
            const typeInterval = setInterval(() => {
                title.textContent += text[i];
                i++;
                if (i >= text.length) {
                    clearInterval(typeInterval);
                }
            }, 100);
        }, index * 500 + 1000);
    });
}

const skillDescriptions = {
    javascript: {
        title: "JavaScript",
        description: "Dynamic and versatile programming language, mainly used for client-side and server-side web development. Enables creating interactive interfaces and modern web applications."
    },
    html5: {
        title: "HTML5",
        description: "Standard markup language for creating web pages. HTML5 brings new features like semantic elements, native multimedia support and modern APIs."
    },
    css3: {
        title: "CSS3",
        description: "Style language that defines the presentation of HTML documents. CSS3 introduces animations, transitions, grids and many properties for modern designs."
    },
    react: {
        title: "React",
        description: "JavaScript library developed by Facebook for building user interfaces. Uses a system of reusable components and a virtual DOM for optimal performance."
    },
    nodejs: {
        title: "Node.js",
        description: "Server-side JavaScript runtime environment. Enables developing high-performance backend applications with JavaScript, using a non-blocking event-driven model."
    },
    python: {
        title: "Python",
        description: "Versatile and easy-to-learn programming language. Widely used for web development, data analysis, artificial intelligence and automation."
    },
    php: {
        title: "PHP",
        description: "Server-side scripting language specifically designed for web development. Widely used to create dynamic websites and web applications."
    },
    cpp: {
        title: "C++",
        description: "Compiled programming language, extension of the C language. Offers low-level control and high performance, used for systems, games and critical applications."
    },
    vscode: {
        title: "VS Code",
        description: "Free source code editor developed by Microsoft. Lightweight, extensible and supporting many languages with advanced features like integrated debugging."
    },
    git: {
        title: "Git",
        description: "Distributed version control system. Allows tracking code changes, team collaboration and managing different versions of a project efficiently."
    },
    docker: {
        title: "Docker",
        description: "Containerization platform that allows packaging applications with their dependencies. Facilitates deployment and ensures consistency between environments."
    },
    csharp: {
        title: "C#",
        description: "Object-oriented programming language developed by Microsoft. Mainly used for developing Windows, web and mobile applications on the .NET platform."
    }
};

function initSkillModals() {
    const skillItems = document.querySelectorAll('.skill-item[data-skill]');

    skillItems.forEach(item => {
        item.addEventListener('click', () => {
            skillItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                }
            });
            
            item.classList.toggle('active');
        });
    });
}
const modal = document.getElementById('skill-modal');
const modalTitle = document.getElementById('skill-modal-title');
const modalDescription = document.getElementById('skill-modal-description');
const closeBtn = document.querySelector('.skill-modal-close');

    skillItems.forEach(item => {
        item.addEventListener('click', () => {
            const skillKey = item.getAttribute('data-skill');
            const skillData = skillDescriptions[skillKey];
            
            if (skillData) {
                modalTitle.textContent = skillData.title;
                modalDescription.textContent = skillData.description;
                modal.style.display = 'block';
                document.body.style.overflow = 'hidden';
            }
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.style.display === 'block') {
            closeModal();
        }
        
    });
