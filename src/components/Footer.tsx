import React from 'react';
import { Facebook, Instagram, Twitter, Phone, Mail, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
    return (
        <footer id="contact" className="bg-black text-white pt-24 pb-10 border-t border-white/10">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="container mx-auto px-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div>
                        <a href="#" className="mb-6 block">
                            <img src="/logo.png" alt="Sportive Hub" className="h-12 w-auto brightness-0 invert" />
                        </a>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            Empowering athletes and individuals to recover faster, perform better, and live pain-free through expert care and modern technology.
                        </p>
                        <div className="flex space-x-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors text-white">
                                <Facebook size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors text-white">
                                <Instagram size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-primary transition-colors text-white">
                                <Twitter size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-white">Quick Links</h4>
                        <ul className="space-y-4">
                            <li><a href="#home" className="text-gray-400 hover:text-primary transition-colors">Home</a></li>
                            <li><a href="#services" className="text-gray-400 hover:text-primary transition-colors">Services</a></li>
                            <li><a href="#locations" className="text-gray-400 hover:text-primary transition-colors">Locations</a></li>
                            <li><a href="#about" className="text-gray-400 hover:text-primary transition-colors">About Us</a></li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-white">Services</h4>
                        <ul className="space-y-4">
                            <li className="text-gray-400">Physiotherapy</li>
                            <li className="text-gray-400">Sports Massage</li>
                            <li className="text-gray-400">Cryotherapy</li>
                            <li className="text-gray-400">Performance Testing</li>
                            <li className="text-gray-400">Rehabilitation</li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-white">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-gray-400">
                                <Phone size={20} className="text-primary mt-1 shrink-0" />
                                <span>+20 103 5555 380</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-400">
                                <Mail size={20} className="text-primary mt-1 shrink-0" />
                                <span>info@sportivehub.com</span>
                            </li>
                            <li className="flex items-start gap-3 text-gray-400">
                                <MapPin size={20} className="text-primary mt-1 shrink-0" />
                                <span>Beverly Hills Compound, Sheikh Zayed City, Egypt</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © {new Date().getFullYear()} Sportive Hub. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-sm text-gray-500">
                        <a href="#" className="hover:text-primary">Privacy Policy</a>
                        <a href="#" className="hover:text-primary">Terms of Service</a>
                    </div>
                </div>
            </motion.div>
        </footer>
    );
};

export default Footer;
