import { useState } from 'react';
import { PageHeader } from './components/PageHeader';
import { Icon } from '@iconify/react';
import { useRef } from 'react';

type Page = 'home' | 'profile' | 'settings' | 'notifications' | 'about';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={navigateTo} />;
      case 'profile':
        return <ProfilePage onNavigate={navigateTo} />;
      case 'settings':
        return <SettingsPage onNavigate={navigateTo} />;
      case 'notifications':
        return <NotificationsPage onNavigate={navigateTo} />;
      case 'about':
        return <AboutPage onNavigate={navigateTo} />;
      default:
        return <HomePage onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-200 flex items-center justify-center p-4">
      <div className="w-full max-w-[375px] h-[812px] bg-gray-50 rounded-[40px] shadow-2xl relative overflow-hidden border-8 border-gray-900">
        {renderPage()}
      </div>
    </div>
  );
}

// Home Page - Variant: title-and-icon
function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50">
      <PageHeader
        title="Dashboard"
        variant="title-and-icon"
        scrollContainerRef={scrollRef}
      />
      
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="card bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <h2 className="text-white mb-2">Welcome Back!</h2>
            <p className="text-white/90 mb-4">Explore all header variants in this demo app</p>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">5 Variants</span>
              <span className="px-3 py-1 bg-white/20 rounded-full text-sm">Scroll Effects</span>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="space-y-3">
            <h3 className="text-gray-600 px-1">Explore Header Variants</h3>
            
            <button
              onClick={() => onNavigate('profile')}
              className="card w-full flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Icon icon="material-symbols:person-outline" className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-gray-900">Profile</h3>
                  <p className="text-sm text-gray-500">Back + Title variant</p>
                </div>
              </div>
              <Icon icon="material-symbols:chevron-right" className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className="card w-full flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Icon icon="material-symbols:settings-outline" className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-500">Back + Title + Icon variant</p>
                </div>
              </div>
              <Icon icon="material-symbols:chevron-right" className="w-6 h-6 text-gray-400" />
            </button>

            <button
              onClick={() => onNavigate('about')}
              className="card w-full flex items-center justify-between hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Icon icon="material-symbols:info-outline" className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-left">
                  <h3 className="text-gray-900">About</h3>
                  <p className="text-sm text-gray-500">Custom content variant</p>
                </div>
              </div>
              <Icon icon="material-symbols:chevron-right" className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h3 className="text-gray-600 px-1">Header Features</h3>
            <div className="card">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="text-gray-900">Scroll-based Blur</h3>
                    <p className="text-sm text-gray-500">Header becomes translucent with blur effect when scrolling</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="text-gray-900">Safe Area Support</h3>
                    <p className="text-sm text-gray-500">Respects device notches and rounded corners</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon icon="material-symbols:check-circle" className="w-6 h-6 text-green-500 mt-0.5" />
                  <div>
                    <h3 className="text-gray-900">Smooth Transitions</h3>
                    <p className="text-sm text-gray-500">300ms Material Design standard animations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Scroll Test Content */}
          <div className="space-y-3">
            <h3 className="text-gray-600 px-1">Scroll to See Effect</h3>
            {[1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="card">
                <h3 className="text-gray-900 mb-2">Content Block {item}</h3>
                <p className="text-gray-600">
                  Scroll down to see the header transition from transparent to frosted glass effect.
                  The background blur creates a beautiful overlay that maintains readability.
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

// Profile Page - Variant: back-and-title
function ProfilePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50">
      <PageHeader
        title="Profile"
        variant="back-and-title"
        onBack={() => onNavigate('home')}
        scrollContainerRef={scrollRef}
      />
      
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="space-y-6">
          {/* Profile Header */}
          <div className="card text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <Icon icon="material-symbols:person" className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-gray-900 mb-1">John Doe</h2>
            <p className="text-gray-500">john.doe@example.com</p>
          </div>

          {/* Variant Info */}
          <div className="card bg-blue-50 border border-blue-200">
            <div className="flex items-start gap-3">
              <Icon icon="material-symbols:info" className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-gray-900 mb-1">Header Variant: back-and-title</h3>
                <p className="text-sm text-gray-600">
                  This variant shows a back button with chevron icon on the left and a title.
                  Perfect for navigation pages.
                </p>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="card">
            <h3 className="text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Username</span>
                <span className="text-gray-900">johndoe</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Member Since</span>
                <span className="text-gray-900">Jan 2024</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Status</span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">Active</span>
              </div>
            </div>
          </div>

          {/* Additional Content for Scroll */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="card">
              <h3 className="text-gray-900 mb-2">Section {item}</h3>
              <p className="text-gray-600">
                Scroll to see the header blur effect. The back button remains accessible even with the translucent background.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Settings Page - Variant: back-title-icon
function SettingsPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [notifications, setNotifications] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50">
      <PageHeader
        title="Settings"
        variant="back-title-icon"
        onBack={() => onNavigate('home')}
        scrollContainerRef={scrollRef}
        rightIcon={
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md">
            <Icon icon="material-symbols:more-vert" className="w-6 h-6 text-[#272727]" />
          </button>
        }
      />
      
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="space-y-6">
          {/* Variant Info */}
          <div className="card bg-purple-50 border border-purple-200">
            <div className="flex items-start gap-3">
              <Icon icon="material-symbols:info" className="w-6 h-6 text-purple-600 mt-0.5" />
              <div>
                <h3 className="text-gray-900 mb-1">Header Variant: back-title-icon</h3>
                <p className="text-sm text-gray-600">
                  This variant shows back button, title, and a right icon (48px). Great for pages with additional actions.
                </p>
              </div>
            </div>
          </div>

          {/* Settings Sections */}
          <div className="card">
            <h3 className="text-gray-900 mb-4">Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:notifications-outline" className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">Notifications</span>
                </div>
                <button
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-7 rounded-full transition-colors ${
                    notifications ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      notifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <div className="flex items-center justify-between py-3 border-t">
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:dark-mode-outline" className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">Dark Mode</span>
                </div>
                <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-400" />
              </div>
              
              <div className="flex items-center justify-between py-3 border-t">
                <div className="flex items-center gap-3">
                  <Icon icon="material-symbols:language" className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-900">Language</span>
                </div>
                <span className="text-gray-500">English</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-gray-900 mb-4">Privacy & Security</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between py-2">
                <span className="text-gray-900">Privacy Policy</span>
                <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 border-t">
                <span className="text-gray-900">Terms of Service</span>
                <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between py-2 border-t">
                <span className="text-gray-900">Data Management</span>
                <Icon icon="material-symbols:chevron-right" className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Scroll Content */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="card">
              <h3 className="text-gray-900 mb-2">Additional Settings {item}</h3>
              <p className="text-gray-600">
                Notice how the right icon stays visible even when the header has the blur effect applied.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Notifications Page - Variant: title-only
function NotificationsPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const notifications = [
    { id: 1, title: 'New message', body: 'You have a new message from Sarah', time: '2m ago', unread: true },
    { id: 2, title: 'Update available', body: 'Version 2.0 is now available', time: '1h ago', unread: true },
    { id: 3, title: 'Welcome!', body: 'Thanks for joining our app', time: '2h ago', unread: false },
    { id: 4, title: 'Weekly summary', body: 'Your activity this week', time: '1d ago', unread: false },
  ];

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50">
      <PageHeader
        title="Notifications"
        variant="title-only"
        scrollContainerRef={scrollRef}
        rightContent={
          <button
            onClick={() => onNavigate('home')}
            className="text-blue-500 hover:text-blue-600"
          >
            Close
          </button>
        }
      />
      
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="space-y-6">
          {/* Variant Info */}
          <div className="card bg-green-50 border border-green-200">
            <div className="flex items-start gap-3">
              <Icon icon="material-symbols:info" className="w-6 h-6 text-green-600 mt-0.5" />
              <div>
                <h3 className="text-gray-900 mb-1">Header Variant: title-only</h3>
                <p className="text-sm text-gray-600">
                  Simple variant with just a title. Using rightContent prop to show a custom close button.
                </p>
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`card ${notif.unread ? 'bg-blue-50 border border-blue-200' : ''}`}
              >
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-gray-900">{notif.title}</h3>
                      {notif.unread && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">{notif.body}</p>
                    <p className="text-sm text-gray-400">{notif.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Scroll Content */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="card">
              <h3 className="text-gray-900 mb-2">Older Notification {item}</h3>
              <p className="text-gray-600">
                This is an older notification. Scroll to see the header blur effect with title-only variant.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// About Page - Custom content variant
function AboutPage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={scrollRef} className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-blue-50 to-purple-50">
      <PageHeader
        title="About"
        variant="about-logo"
        scrollContainerRef={scrollRef}
        customContent={
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={() => onNavigate('home')}
              className="flex items-center justify-center w-8 h-8 -ml-1"
            >
              <Icon 
                className="w-8 h-8 text-[#272727]" 
                icon="material-symbols:chevron-left" 
              />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Icon icon="material-symbols:apps" className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-content-title">About App</h1>
            </div>
          </div>
        }
        rightIcon={
          <button className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md">
            <Icon icon="material-symbols:share" className="w-6 h-6 text-[#272727]" />
          </button>
        }
      />
      
      <main className="pt-[calc(env(safe-area-inset-top)+88px)] px-6 pb-8">
        <div className="space-y-6">
          {/* Variant Info */}
          <div className="card bg-orange-50 border border-orange-200">
            <div className="flex items-start gap-3">
              <Icon icon="material-symbols:info" className="w-6 h-6 text-orange-600 mt-0.5" />
              <div>
                <h3 className="text-gray-900 mb-1">Header Variant: Custom Content</h3>
                <p className="text-sm text-gray-600">
                  Using customContent prop to create a fully custom header layout with logo, back button, and share icon.
                </p>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="card text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Icon icon="material-symbols:apps" className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-gray-900 mb-2">PageHeader Demo</h2>
            <p className="text-gray-600 mb-4">Version 1.0.0</p>
            <p className="text-sm text-gray-500">
              A demonstration app showcasing all variants of the reusable PageHeader component with scroll-based blur effects.
            </p>
          </div>

          {/* Features */}
          <div className="card">
            <h3 className="text-gray-900 mb-4">All Variants Demonstrated</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">title-only</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">back-and-title</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">back-title-icon</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">title-and-icon</span>
              </div>
              <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <Icon icon="material-symbols:check-circle" className="w-5 h-5 text-green-500" />
                <span className="text-gray-700">Custom content</span>
              </div>
            </div>
          </div>

          {/* Credits */}
          <div className="card">
            <h3 className="text-gray-900 mb-3">Built With</h3>
            <div className="space-y-2 text-gray-600">
              <p>• React & TypeScript</p>
              <p>• Tailwind CSS v4</p>
              <p>• Iconify Icons</p>
              <p>• Safe Area Insets</p>
            </div>
          </div>

          {/* Scroll Content */}
          {[1, 2, 3].map((item) => (
            <div key={item} className="card">
              <h3 className="text-gray-900 mb-2">Additional Info {item}</h3>
              <p className="text-gray-600">
                Scroll to see how the custom header content maintains clarity with the blur effect.
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}