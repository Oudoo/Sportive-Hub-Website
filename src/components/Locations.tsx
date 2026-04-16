import React from 'react';
import { MapPin, ArrowUpRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Locations: React.FC = () => {
    const locations = [
        {
            name: 'Beverly Sheikh Zayed',
            address: 'Beverly Hills Compound, Sheikh Zayed City',
            image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        },
        {
            name: 'Mivida 5th Settlement',
            address: 'Mivida Business Park, New Cairo',
            image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
        },
        {
            name: 'Almaza Bay North Coast',
            address: 'Almaza Bay Resort, Mersa Matruh',
            image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {locations.map((location, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 50 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.2, duration: 0.6 }}
                            className="group relative h-[500px] overflow-hidden rounded-none border-b-2 border-primary/0 hover:border-primary transition-colors duration-300"
                        >
                            <div className="absolute inset-0 bg-gray-900 z-0">
                                <img
                                    src={location.image}
                                    alt={location.name}
                                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 opacity-60 group-hover:opacity-40"
                                />
                            </div>

                            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-90"></div>

                            <div className="absolute bottom-0 left-0 p-8 w-full z-10 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                <div className="flex items-start gap-3 mb-4">
                                    <div className="p-2 bg-primary/20 rounded-full backdrop-blur-sm">
                                        <MapPin className="text-primary" size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-heading font-bold text-white leading-tight mb-2 group-hover:text-primary transition-colors">{location.name}</h4>
                                        <p className="text-gray-400 text-sm">{location.address}</p>
                                    </div>
                                </div>

                                <motion.a
                                    href="#"
                                    className="inline-flex items-center gap-2 text-white font-bold uppercase tracking-wider text-sm border-b border-primary pb-1 hover:text-primary transition-colors opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 delay-100"
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
