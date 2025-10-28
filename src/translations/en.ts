export const en = {
  common: {
    greeting: "As-Salamu-Aleikum",
    supportYourUmmah: "Support your Ummah.",
    welcome: "Welcome",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    back: "Back",
    next: "Next",
    previous: "Previous",
    submit: "Submit",
    confirm: "Confirm",
    yes: "Yes",
    no: "No"
  },
  navigation: {
    home: "Home",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    login: "Login",
    register: "Register",
    about: "About",
    contact: "Contact"
  },
  auth: {
    login: "Login",
    register: "Register",
    logout: "Logout",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot Password?",
    resetPassword: "Reset Password",
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    createAccount: "Create Account"
  },
  profile: {
    personalInfo: "Personal Information",
    fullName: "Full Name",
    firstName: "First Name",
    lastName: "Last Name",
    email: "Email",
    phone: "Phone",
    address: "Address",
    city: "City",
    country: "Country",
    editProfile: "Edit Profile",
    changePassword: "Change Password",
    accountSettings: "Account Settings"
  },
  landing: {
    hero: {
      title: "From <span class=\"text-primary\">Muslims</span><br class=\"block sm:hidden\" /> for <span class=\"text-primary\">Muslims</span>",
      subtitle: "A marketplace: Halal, transparent and with Barakah – for you and your Ummah.",
      getStarted: "Discover your Ummah",
      learnMore: "Learn More"
    },
    bismillah: {
      translation: "In the name of Allah, the Most Gracious, the Most Merciful"
    }
  },
  language: {
    switchTo: "Switch to",
    current: "Current language",
    english: "English",
    german: "German"
  },
  search: {
    placeholder: "Search in your Ummah",
    ariaLabel: "Search in the Ummah",
    all: "All",
    everywhere: "Everywhere",
    unnamed: "Unnamed"
  },
  categories: {
    // Add common category translations
    food: "Food",
    clothing: "Clothing", 
    electronics: "Electronics",
    books: "Books",
    services: "Services",
    health: "Health",
    education: "Education",
    transportation: "Transportation"
  },
  actions: {
    save: "Save",
    saved: "Saved",
    saving: "Saving...",
    saveChanges: "Save Changes",
    noChanges: "No Changes",
    removeSaved: "Remove Saved"
  },
  providers: {
    errorLoading: "There was a problem loading the providers. Please try again.",
    errorTitle: "Error Loading",
    noResultsFound: "No results found",
    noResultsDescription: "Try a different search term or filter",
    loadingProviders: "Loading providers...",
    searchProviders: "Search providers",
    allProviders: "All Providers",
    bookmarkedProviders: "Bookmarked Providers",
    save: "Save",
    saved: "Saved",
    saveProvider: "Save Provider",
    removeSaved: "Remove Saved",
    shareProvider: "Share Provider",
    call: "Call",
    website: "Website",
    addressTapToNavigate: "Tap address to navigate",
    online: "Online",
    donations: "Donations",
    initiativesSupported: "Initiatives supported",
    weOffer: "We offer",
    weNeed: "We need",
    selectCategory: "Select category"
  },
  create: {
    title: "Add Provider",
    description: "Add a new provider or recommend someone you know.",
    ownProvider: {
      title: "I am the provider",
      description: "Create your own profile to make your offer visible.",
      buttonText: "Create own offer"
    },
    recommendProvider: {
      title: "I know a provider",
      description: "Recommend someone you know so others can find them.",
      buttonText: "Recommend provider"
    },
    basics: {
      title: "Create offer",
      loginRequired: "Login required",
      loginDescription: "You must be logged in to create an offer.",
      goToLogin: "Go to login",
      desktopMessage: "Please use the mobile view for offer creation."
    },
    steps: {
      basics: "Basics",
      location: "Location",
      contact: "Contact",
      media: "Media"
    },
    category: {
      searchPlaceholder: "Search category...",
      loading: "Loading...",
      redirecting: "Redirecting...",
      noResults: "No categories found",
      noResultsDescription: "Try a different search term"
    }
  }
} as const;
