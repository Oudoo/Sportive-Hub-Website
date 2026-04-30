import React, { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [isServicesOpen, setIsServicesOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const servicesList = [
        { name: 'Physical Therapy', href: '/services#physical-therapy' },
        { name: 'IV Drips', href: '/services#iv-drips' },
        { name: 'EMS Suits', href: '/services#ems-suits' },
        { name: 'Nutrition', href: '/services#nutrition' },
        { name: 'Psychiatry', href: '/services#psychiatry' },
        { name: 'Ortho', href: '/services#ortho' },
        { name: 'Neuro', href: '/services#neuro' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 border-b border-transparent ${scrolled
                ? 'bg-background/90 backdrop-blur-xl border-white/10 shadow-lg py-2'
                : 'bg-transparent py-4'
                }`}
        >
            <div className="container mx-auto px-6 flex justify-between items-center">
                {/* Logo */}
                <Link to="/" className="block">
                    <img src="/logo.png" alt="Sportive Hub" className="h-12 w-auto brightness-0 invert" />
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-8">
                    <Link
                        to="/#home"
                        className="text-text hover:text-white font-medium text-sm uppercase tracking-widest relative group"
                    >
                        Home
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
                    </Link>

                    {/* Services Dropdown */}
                    <div 
                        className="relative group"
                        onMouseEnter={() => setIsServicesOpen(true)}
                        onMouseLeave={() => setIsServicesOpen(false)}
                    >
                        <Link
                            to="/services"
                            className="text-text hover:text-white font-medium text-sm uppercase tracking-widest flex items-center gap-1 py-4"
                        >
                            Services <ChevronDown size={16} className={`transition-transform duration-300 ${isServicesOpen ? 'rotate-180' : ''}`} />
                        </Link>
                        
                        <AnimatePresence>
                            {isServicesOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute top-full left-0 mt-0 w-56 bg-background/95 backdrop-blur-xl border border-white/10 shadow-2xl py-2 rounded-md overflow-hidden"
                                >
                                    {servicesList.map((service) => (
                                        <Link
                                            key={service.name}
                                            to={service.href}
                                            className="block px-6 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
                                            onClick={() => setIsServicesOpen(false)}
                                        >
                                            {service.name}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <Link
                        to="/#locations"
                        className="text-text hover:text-white font-medium text-sm uppercase tracking-widest relative group"
                    >
                        Locations
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
                    </Link>

                    <Link
                        to="/#about"
                        className="text-text hover:text-white font-medium text-sm uppercase tracking-widest relative group"
                    >
                        About Us
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full"></span>
                    </Link>

                    <motion.a
                        href="/#contact"
                        className="relative overflow-hidden bg-primary text-white px-8 py-3 rounded-full font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-all shadow-[0_0_20px_rgba(1,102,255,0.5)] hover:shadow-[0_0_30px_rgba(1,102,255,0.8)] ml-4"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <span className="relative z-10">Book Now</span>
                    </motion.a>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-white p-2"
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
                        <div className="flex flex-col p-6 space-y-6">
                            <Link
                                to="/#home"
                                className="text-text hover:text-white font-heading font-bold text-xl uppercase tracking-widest"
                                onClick={() => setIsOpen(false)}
                            >
                                Home
                            </Link>

                            <div className="flex flex-col space-y-4">
                                <Link
                                    to="/services"
                                    className="text-text hover:text-white font-heading font-bold text-xl uppercase tracking-widest flex items-center gap-2"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Services
                                </Link>
                                <div className="pl-6 flex flex-col space-y-3 border-l-2 border-white/10 ml-2">
                                    {servicesList.map((service) => (
                                        <Link
                                            key={service.name}
                                            to={service.href}
                                            className="text-gray-400 hover:text-white font-medium text-sm uppercase tracking-wider"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            {service.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            <Link
                                to="/#locations"
                                className="text-text hover:text-white font-heading font-bold text-xl uppercase tracking-widest"
                                onClick={() => setIsOpen(false)}
                            >
                                Locations
                            </Link>
                            
                            <Link
                                to="/#about"
                                className="text-text hover:text-white font-heading font-bold text-xl uppercase tracking-widest"
                                onClick={() => setIsOpen(false)}
                            >
                                About Us
                            </Link>

                            <a
                                href="/#contact"
                                className="w-full bg-primary text-white px-6 py-4 rounded-full font-bold uppercase tracking-wider text-center hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 mt-4"
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
