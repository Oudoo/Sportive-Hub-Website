import React, { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Home', href: '#home' },
        { name: 'Services', href: '#services' },
        { name: 'Locations', href: '#locations' },
        { name: 'About Us', href: '#about' },
    ];

    const magneticVariants = {
        hover: {
            scale: 1.1,
            transition: { type: "spring" as const, stiffness: 400, damping: 10 }
        },
        tap: { scale: 0.95 }
    };

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 border-b border-transparent ${scrolled
                ? 'bg-background/70 backdrop-blur-xl border-white/10 shadow-lg py-2'
                : 'bg-transparent py-4'
                }`}
        >
            <div className="container mx-auto px-6 flex justify-between items-center">
                {/* Logo */}
                <a href="#" className="block">
                    <img src="/logo.png" alt="Sportive Hub" className="h-12 w-auto brightness-0 invert" />
                </a>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-10">
                    {navLinks.map((link) => (
                        <motion.a
                            key={link.name}
                            href={link.href}
                            className="text-text hover:text-white font-medium text-sm uppercase tracking-widest relative group"
                            whileHover="hover"
                            whileTap="tap"
                            variants={magneticVariants}
                        >
                            {link.name}
                            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
                        </motion.a>
                    ))}
                    <motion.a
                        href="#contact"
                        className="relative overflow-hidden bg-primary text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-all shadow-[0_0_20px_rgba(1,102,255,0.5)] hover:shadow-[0_0_30px_rgba(1,102,255,0.8)]"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="relative z-10">Book Now</span>
                    </motion.a>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-background/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
                    >
                        <div className="flex flex-col p-8 space-y-6 items-center">
                            {navLinks.map((link) => (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    className="text-text hover:text-white font-heading font-bold text-2xl uppercase tracking-widest"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </a>
                            ))}
                            <a
                                href="#contact"
                                className="w-full bg-primary text-white px-6 py-4 rounded-full font-bold uppercase tracking-wider text-center hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
                                onClick={() => setIsOpen(false)}
                            >
                                Book Appointment
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
