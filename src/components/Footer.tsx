import React from 'react';
import { Facebook, Instagram, MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer id="contact" className="bg-surface text-text pt-24 pb-10 border-t border-primary/10">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="container mx-auto px-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="mb-6 block">
                            <img src="/logo.png" alt="Sportive Hub" className="h-12 w-auto brightness-0 invert" />
                        </Link>
                        <p className="text-text mb-6 leading-relaxed">
                            Empowering athletes and individuals to recover faster, perform better, and live pain-free through expert care and modern technology.
                        </p>
                        <div className="flex space-x-4">
                            <a href="https://www.facebook.com/profile.php?id=61583795000181&mibextid=wwXIfr&mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary">
                                <Facebook size={20} />
                            </a>
                            <a href="https://www.instagram.com/sportivehub_?igsh=MXUyOTRxMDMxbzU0NA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary">
                                <Instagram size={20} />
                            </a>
                            <a href="https://wa.me/201035555380?text=Hello%20can%20I%20make%20a%20booking%20at%20Sportive%20Hub%3F" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-primary hover:text-white transition-colors text-primary">
                                <MessageCircle size={20} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-heading">Quick Links</h4>
                        <ul className="space-y-4">
                            <li><Link to="/#home" className="text-text hover:text-primary transition-colors">Home</Link></li>
                            <li><Link to="/services" className="text-text hover:text-primary transition-colors">Services</Link></li>
                            <li><Link to="/#locations" className="text-text hover:text-primary transition-colors">Locations</Link></li>
                            <li><Link to="/#about" className="text-text hover:text-primary transition-colors">About Us</Link></li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-heading">Services</h4>
                        <ul className="space-y-4">
                            <li><Link to="/services#physical-therapy" className="text-text hover:text-primary transition-colors">Physical Therapy</Link></li>
                            <li><Link to="/services#iv-drips" className="text-text hover:text-primary transition-colors">IV Drips</Link></li>
                            <li><Link to="/services#ems-suits" className="text-text hover:text-primary transition-colors">EMS Suits</Link></li>
                            <li><Link to="/services#nutrition" className="text-text hover:text-primary transition-colors">Nutrition</Link></li>
                            <li><Link to="/services#psychiatry" className="text-text hover:text-primary transition-colors">Psychiatry</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-lg font-bold mb-6 text-heading">Contact Us</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-text">
                                <Phone size={20} className="text-primary mt-1 shrink-0" />
                                <span>+20 103 5555 380</span>
                            </li>
                            <li className="flex items-start gap-3 text-text">
                                <Mail size={20} className="text-primary mt-1 shrink-0" />
                                <span>info@sportivehub.com</span>
                            </li>
                            <li className="flex items-start gap-3 text-text">
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
