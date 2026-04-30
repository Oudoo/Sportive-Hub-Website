import React from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Locations: React.FC = () => {
    const locations = [
        {
            name: 'Beverly Sheikh Zayed',
            address: 'Sodic Medical District, Building 4 - 2nd floor, Clinic 212\nسوديك مبنى الدائري, مبنى ٤ - الدور الثاني, عياده ٢١٢',
            lat: 30.068115,
            lng: 30.933786,
        },
        {
            name: 'Almaza Bay North Coast',
            address: 'Almaza Bay Resort, Mersa Matruh',
            lat: 31.197220,
            lng: 27.553516,
        },
    ];

    return (
        <section id="locations" className="py-24 bg-background relative">
            <div className="container mx-auto px-6">
                <div className="mb-20 flex flex-col md:flex-row justify-between items-end gap-8 border-b border-white/10 pb-10">
                    <div>
                        <motion.span
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            className="text-primary font-bold tracking-[0.2em] uppercase mb-2 block"
                        >
                            Worldwide Standard
                        </motion.span>
                        <motion.h3
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl md:text-6xl font-heading font-bold text-white uppercase"
                        >
                            Our <span className="text-stroke-2 text-transparent bg-clip-text bg-white/20">Locations</span>
                        </motion.h3>
                    </div>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-gray-400 max-w-md text-right md:text-lg"
                    >
                        Visit us at our premium facilities designed for elite recovery and performance.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                    {locations.map((location, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.6 }}
                            className="group relative h-[500px] overflow-hidden bg-gray-900 border border-white/10 hover:border-primary transition-colors duration-300 flex flex-col"
                        >
                            <div className="flex-1 w-full h-full relative z-0">
                                <iframe 
                                    width="100%" 
                                    height="100%" 
                                    style={{ border: 0, filter: 'grayscale(1) contrast(1.2) opacity(0.8)' }} 
                                    loading="lazy" 
                                    allowFullScreen 
                                    src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                ></iframe>
                            </div>

                            <div className="bg-black/80 backdrop-blur-md p-8 relative z-10 border-t border-white/5">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-primary/20 rounded-full shrink-0">
                                        <MapPin className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-heading font-bold text-white leading-tight mb-2 group-hover:text-primary transition-colors">{location.name}</h4>
                                        <p className="text-gray-400 text-sm whitespace-pre-line">{location.address}</p>
                                    </div>
                                </div>

                                <motion.a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-primary pb-1 hover:text-primary transition-colors"
                                >
                                    Get Directions <ArrowUpRight size={16} />
                                </motion.a>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Locations;
