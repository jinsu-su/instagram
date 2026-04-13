import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "./ui/button";
import { Menu, X } from "lucide-react";

const Navbar = ({ isTransparent = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isHome = location.pathname === '/';

    // Helper to handle navigation to hash sections
    const handleNavClick = (hash) => {
        if (isHome) {
            // If on home, just scroll
            const element = document.querySelector(hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            // If not on home, go to home then hash
            navigate(`/${hash}`);
        }
        setMobileMenuOpen(false);
    };

    const navClass = isTransparent
        ? (scrolled ? 'py-1 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm' : 'py-2 bg-transparent')
        : 'py-1 bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-sm';

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navClass}`}>
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <img
                        src="/assets/aidm-logo-ultra.png"
                        alt="AIDM"
                        className="h-20 w-auto object-contain"
                    />
                </div>

                <div className="hidden md:flex items-center gap-8">
                    <button onClick={() => handleNavClick('#features')} className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">기능 소개</button>
                    <button onClick={() => handleNavClick('#comparison')} className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">Why AIDM</button>
                    <button onClick={() => handleNavClick('#use-cases')} className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">활용 사례</button>
                    <button onClick={() => navigate('/pricing')} className="text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">요금제</button>
                    <Button
                        onClick={() => navigate('/login')}
                        className="bg-black text-white hover:bg-gray-800 rounded-full px-6 py-2.5 font-bold text-sm shadow-xl shadow-gray-200 transition-all hover:scale-105"
                    >
                        시작하기
                    </Button>
                </div>

                <button className="md:hidden p-2 text-gray-900" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b shadow-lg animate-in fade-in slide-in-from-top-2 p-6 flex flex-col gap-6">
                    <button onClick={() => handleNavClick('#features')} className="text-lg font-bold text-gray-800 text-left">기능 소개</button>
                    <button onClick={() => handleNavClick('#comparison')} className="text-lg font-bold text-gray-800 text-left">Why AIDM</button>
                    <button onClick={() => handleNavClick('#use-cases')} className="text-lg font-bold text-gray-800 text-left">활용 사례</button>
                    <button onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }} className="text-lg font-bold text-gray-800 text-left">요금제</button>
                    <Button onClick={() => navigate('/login')} className="w-full bg-black text-white font-bold h-12 rounded-xl text-lg">지금 시작하기</Button>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
