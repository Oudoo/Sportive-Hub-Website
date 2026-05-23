import React from 'react';
import { Facebook, Instagram, MessageCircle, Phone, Mail, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <footer id="contact" className="bg-primary text-white pt-12 pb-8 border-t border-white/10">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="container mx-auto px-6"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                    {/* Brand */}
                    <div>
                        <Link to="/" className="mb-4 block">
                            <img src="/logo.png" alt="Sportive Hub" className="h-10 w-auto brightness-0 invert" />
                        </Link>
                        <p className="text-white/80 mb-4 text-sm leading-relaxed max-w-sm">
                            Empowering athletes and individuals to recover faster, perform better, and live pain-free through expert care and modern technology.
                        </p>
                        <div className="flex space-x-3">
                            <a href="https://www.facebook.com/profile.php?id=61583795000181&mibextid=wwXIfr&mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 shadow-sm flex items-center justify-center hover:bg-white hover:text-primary transition-all text-white">
                                <Facebook size={16} />
                            </a>
                            <a href="https://www.instagram.com/sportivehub_?igsh=MXUyOTRxMDMxbzU0NA%3D%3D&utm_source=qr" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 shadow-sm flex items-center justify-center hover:bg-white hover:text-primary transition-all text-white">
                                <Instagram size={16} />
                            </a>
                            <a href="https://wa.me/201035555380?text=Hello%20can%20I%20make%20a%20booking%20at%20Sportive%20Hub%3F" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/10 shadow-sm flex items-center justify-center hover:bg-white hover:text-primary transition-all text-white">
                                <MessageCircle size={16} />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="text-base font-bold mb-4 text-white">Quick Links</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/#home" className="text-blue-100 hover:text-white transition-colors">Home</Link></li>
                            <li><Link to="/services" className="text-blue-100 hover:text-white transition-colors">Services</Link></li>
                            <li><Link to="/#locations" className="text-blue-100 hover:text-white transition-colors">Locations</Link></li>
                            <li><Link to="/#about" className="text-blue-100 hover:text-white transition-colors">About Us</Link></li>
                        </ul>
                    </div>

                    {/* Services */}
                    <div>
                        <h4 className="text-base font-bold mb-4 text-white">Services</h4>
                        <ul className="space-y-2.5 text-sm">
                            <li><Link to="/services#physical-therapy" className="text-blue-100 hover:text-white transition-colors">Physical Therapy</Link></li>
                            <li><Link to="/services#iv-drips" className="text-blue-100 hover:text-white transition-colors">IV Drips</Link></li>
                            <li><Link to="/services#ems-suits" className="text-blue-100 hover:text-white transition-colors">EMS Suits</Link></li>
                            <li><Link to="/services#nutrition" className="text-blue-100 hover:text-white transition-colors">Nutrition</Link></li>
                            <li><Link to="/services#psychiatry" className="text-blue-100 hover:text-white transition-colors">Psychiatry</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="text-base font-bold mb-4 text-white">Contact Us</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Phone size={16} className="text-blue-200 mt-1 shrink-0" />
                                <span>+20 103 5555 380</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <Mail size={16} className="text-blue-200 mt-1 shrink-0" />
                                <span>info@sportivehub.com</span>
                            </li>
                            <li className="flex items-start gap-2.5 text-white/90">
                                <MapPin size={16} className="text-blue-200 mt-1 shrink-0" />
                                <span>Beverly Hills Compound, Sheikh Zayed City, Egypt</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
                    <p className="text-blue-200/70">
                        © {new Date().getFullYear()} Sportive Hub. All rights reserved.
                    </p>
                    <div className="flex gap-6 text-blue-200/70">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </motion.div>
        </footer>
    );
};

export default Footer;
