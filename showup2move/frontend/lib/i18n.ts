"use client";

import { useEffect, useState } from "react";

export type Language = "en" | "ro";

const STORAGE_KEY = "showup2move:lang";

const dictionary = {
    en: {
        dashboard: "Dashboard",
        showup: "ShowUp",
        groups: "Groups",
        events: "Events",
        profile: "Profile",
        login: "Login",
        register: "Register",
        save: "Save",
        delete: "Delete",
        createEvent: "Create event",
        openChat: "Open chat",
        runMatcher: "Run matcher",
        addToCalendar: "Add to calendar",
        inviteFriend: "Invite friend",
        copyLink: "Copy share link",
        acceptInvite: "Accept invite",
        achievements: "Achievements",
        fitnessIntegrations: "Fitness integrations",
        weather: "Weather check",
        balanceTeams: "Balance teams",
        connectDemo: "Connect demo",
        disconnect: "Disconnect",
        language: "Language",
        logout: "Logout",
        list: "List",
        calendar: "Calendar",
        attending: "Attending",
        joinEvent: "Join Event",
        participants: "participants",
        participant: "participant",
        openEvents: "Open events",
        manualPlanning: "Manual planning",
        eventsDescription: "Events are specific activities. Each event can belong to a group or be independent.",
        loadingEvents: "Loading events...",
        noEvents: "No events yet.",
        today: "Today",
        eventsYouAttending: "Events you're attending",
        otherEvents: "Other events",
        darkMode: "Dark Mode",
        lightMode: "Light Mode",
        close: "Close",
        generatePlan: "Generate Plan",
        captainCoordinationPlan: "Captain Coordination Plan",
        aiPoweredCoordination: "Get an AI-powered coordination plan to help organize this event.",
        generateCaptainPlan: "Generate Captain Plan",
        aiGenerated: "AI Generated",
        actionChecklist: "Action Checklist:",
        suggestedMessage: "Suggested Message:",
        copyMessage: "Copy Message",
        messageCopied: "Message copied to clipboard!",
        couldNotGeneratePlan: "Could not generate captain plan.",
        aiUnavailable: "AI is unavailable right now. Try again later.",
        localAI: "Local AI",
        cloudAI: "Cloud AI",
        fallback: "Fallback",
        matchExplanation: "Match Explanation",
        explainWithAI: "Explain with AI",
        aiPoweredExplanation: "Get an AI-powered explanation of why this group is a good match for you.",
        aiAnalysis: "AI Analysis",
        whyThisWorks: "Why this works:",
        couldNotGenerateExplanation: "Could not generate explanation.",
        yes: "Yes",
        no: "No",
        showUpToday: "ShowUpToday?",
        showUpTodayDescription: "Mark today and the matcher can place you in a group for sports you already like.",
        youAreAvailable: "You are available today.",
        youAreUnavailable: "You are marked unavailable today.",
        savedFor: "Saved for",
        available: "available",
        notAvailable: "not available",
        couldNotSaveAvailability: "Could not save availability. Try again.",
        achievementUnlocked: "Achievement unlocked:",
        january: "January",
        february: "February",
        march: "March",
        april: "April",
        may: "May",
        june: "June",
        july: "July",
        august: "August",
        september: "September",
        october: "October",
        november: "November",
        december: "December",
        sun: "Sun",
        mon: "Mon",
        tue: "Tue",
        wed: "Wed",
        thu: "Thu",
        fri: "Fri",
        sat: "Sat",
        viewAll: "View all",
        noGroupsYet: "No groups yet",
        noGroupsDescription: "Mark yourself available and run the matcher to join a group.",
        noEventsYet: "No events yet",
        noEventsDescription: "Create an event or join a group to get started.",
        welcome: "Welcome",
        todaysBoard: "TODAY'S BOARD",
        activeGroupsAndEvents: "active groups and events.",
        addCityToImprove: "Add your city to improve local matching.",
        editProfile: "Edit profile",
        sports: "Sports",
        currentGroup: "Current group",
        sportsIdentity: "SPORTS IDENTITY",
        createProfileFirst: "Create your profile before opening the dashboard.",
        couldNotLoadSports: "Could not load sports. Please check if the backend is running.",
        loginRequired: "Login required.",
        smartSocialSportsMatching: "Smart social sports matching",
        showUpTodayHero: "Show up today",
        openDashboard: "Open dashboard",
        profileStep: "Profile",
        profileStepDesc: "Sports, city, skill signals",
        showUpTodayStep: "ShowUpToday?",
        showUpTodayStepDesc: "One tap availability",
        matchStep: "Match",
        matchStepDesc: "Sport-sized groups with captain",
        coordinateStep: "Coordinate",
        coordinateStepDesc: "Chat and manual events",
        sportsReadyToMatch: "Sports ready to match",
        createProfileDescription: "Create a profile, mark today's availability, get matched into the right group, chat, and build a real plan before the energy disappears.",
        autoMatchReady: "Auto-match ready",
        players: "players"
    },
    ro: {
        dashboard: "Panou",
        showup: "ShowUp",
        groups: "Grupuri",
        events: "Evenimente",
        profile: "Profil",
        login: "Autentificare",
        register: "Inregistrare",
        save: "Salveaza",
        delete: "Sterge",
        createEvent: "Creeaza eveniment",
        openChat: "Deschide chat",
        runMatcher: "Ruleaza matcher",
        addToCalendar: "Adauga in calendar",
        inviteFriend: "Invita un prieten",
        copyLink: "Copiaza link",
        acceptInvite: "Accepta invitatia",
        achievements: "Realizari",
        fitnessIntegrations: "Integrari fitness",
        weather: "Vreme",
        balanceTeams: "Echipe echilibrate",
        connectDemo: "Conecteaza demo",
        disconnect: "Deconecteaza",
        language: "Limba",
        logout: "Iesire",
        list: "Lista",
        calendar: "Calendar",
        attending: "Particip",
        joinEvent: "Alatura-te",
        participants: "participanti",
        participant: "participant",
        openEvents: "Evenimente deschise",
        manualPlanning: "Planificare manuala",
        eventsDescription: "Evenimentele sunt activitati specifice. Fiecare eveniment poate apartine unui grup sau poate fi independent.",
        loadingEvents: "Se incarca evenimentele...",
        noEvents: "Nici un eveniment inca.",
        today: "Astazi",
        eventsYouAttending: "Evenimente la care participi",
        otherEvents: "Alte evenimente",
        darkMode: "Mod Intunecat",
        lightMode: "Mod Luminos",
        close: "Inchide",
        generatePlan: "Genereaza Plan",
        captainCoordinationPlan: "Plan de Coordonare Capitan",
        aiPoweredCoordination: "Obtine un plan de coordonare generat de AI pentru a organiza acest eveniment.",
        generateCaptainPlan: "Genereaza Plan Capitan",
        aiGenerated: "Generat de AI",
        actionChecklist: "Lista de Actiuni:",
        suggestedMessage: "Mesaj Sugerat:",
        copyMessage: "Copiaza Mesaj",
        messageCopied: "Mesaj copiat in clipboard!",
        couldNotGeneratePlan: "Nu s-a putut genera planul capitanului.",
        aiUnavailable: "AI nu este disponibil momentan. Incearca mai tarziu.",
        localAI: "AI Local",
        cloudAI: "AI Cloud",
        fallback: "Rezerva",
        matchExplanation: "Explicatie Potrivire",
        explainWithAI: "Explica cu AI",
        aiPoweredExplanation: "Obtine o explicatie generata de AI despre de ce acest grup este potrivit pentru tine.",
        aiAnalysis: "Analiza AI",
        whyThisWorks: "De ce functioneaza:",
        couldNotGenerateExplanation: "Nu s-a putut genera explicatia.",
        yes: "Da",
        no: "Nu",
        showUpToday: "ShowUpAstazi?",
        showUpTodayDescription: "Marcheaza astazi si matcher-ul te poate plasa intr-un grup pentru sporturile pe care le practici deja.",
        youAreAvailable: "Esti disponibil astazi.",
        youAreUnavailable: "Esti marcat ca indisponibil astazi.",
        savedFor: "Salvat pentru",
        available: "disponibil",
        notAvailable: "indisponibil",
        couldNotSaveAvailability: "Nu s-a putut salva disponibilitatea. Incearca din nou.",
        achievementUnlocked: "Realizare deblocata:",
        january: "Ianuarie",
        february: "Februarie",
        march: "Martie",
        april: "Aprilie",
        may: "Mai",
        june: "Iunie",
        july: "Iulie",
        august: "August",
        september: "Septembrie",
        october: "Octombrie",
        november: "Noiembrie",
        december: "Decembrie",
        sun: "Dum",
        mon: "Lun",
        tue: "Mar",
        wed: "Mie",
        thu: "Joi",
        fri: "Vin",
        sat: "Sam",
        viewAll: "Vezi tot",
        noGroupsYet: "Inca nu ai grupuri",
        noGroupsDescription: "Marcheaza-te disponibil si ruleaza matcher-ul pentru a te alatura unui grup.",
        noEventsYet: "Inca nu ai evenimente",
        noEventsDescription: "Creeaza un eveniment sau alatura-te unui grup pentru a incepe.",
        welcome: "Bun venit",
        todaysBoard: "PANOUL DE ASTAZI",
        activeGroupsAndEvents: "grupuri si evenimente active.",
        addCityToImprove: "Adauga orasul tau pentru a imbunatati potrivirile locale.",
        editProfile: "Editeaza profil",
        sports: "Sporturi",
        currentGroup: "Grup curent",
        sportsIdentity: "IDENTITATE SPORTIVA",
        createProfileFirst: "Creeaza-ti profilul inainte de a deschide panoul.",
        couldNotLoadSports: "Nu s-au putut incarca sporturile. Verifica daca backend-ul ruleaza.",
        loginRequired: "Autentificare necesara.",
        smartSocialSportsMatching: "Potrivire inteligenta pentru sporturi sociale",
        showUpTodayHero: "Prezinta-te astazi",
        openDashboard: "Deschide panoul",
        profileStep: "Profil",
        profileStepDesc: "Sporturi, oras, semnale de nivel",
        showUpTodayStep: "ShowUpAstazi?",
        showUpTodayStepDesc: "Disponibilitate intr-un singur tap",
        matchStep: "Potrivire",
        matchStepDesc: "Grupuri dimensionate pentru sport cu capitan",
        coordinateStep: "Coordonare",
        coordinateStepDesc: "Chat si evenimente manuale",
        sportsReadyToMatch: "Sporturi gata de potrivire",
        createProfileDescription: "Creeaza un profil, marcheaza disponibilitatea de astazi, potriveste-te in grupul potrivit, discuta si construieste un plan real inainte ca energia sa dispara.",
        autoMatchReady: "Gata pentru potrivire automata",
        players: "jucatori"
    }
} as const;

export type TranslationKey = keyof typeof dictionary.en;

function normalizeLanguage(value: string | null | undefined): Language {
    return value === "ro" ? "ro" : "en";
}

export function getStoredLanguage(): Language {
    if (typeof window === "undefined") return "en";
    return normalizeLanguage(window.localStorage.getItem(STORAGE_KEY));
}

export function setStoredLanguage(language: Language) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    window.dispatchEvent(new CustomEvent("showup2move:lang-changed", { detail: language }));
}

export function useI18n() {
    const [language, setLanguage] = useState<Language>("en");

    useEffect(() => {
        const stored = getStoredLanguage();
        setLanguage(stored);
        document.documentElement.lang = stored;
    }, []);

    useEffect(() => {
        function handleChange(event: Event) {
            if (event instanceof StorageEvent && event.key && event.key !== STORAGE_KEY) return;
            setLanguage(getStoredLanguage());
        }

        window.addEventListener("showup2move:lang-changed", handleChange);
        window.addEventListener("storage", handleChange);

        return () => {
            window.removeEventListener("showup2move:lang-changed", handleChange);
            window.removeEventListener("storage", handleChange);
        };
    }, []);

    const t = (key: TranslationKey) => dictionary[language][key] || dictionary.en[key];

    return {
        language,
        setLanguage: (value: Language) => {
            setLanguage(value);
            setStoredLanguage(value);
        },
        t
    };
}
