import React from 'react';
import { Activity, Hand, Thermometer, Zap, Heart, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Services: React.FC = () => {
    const services = [
        {
            icon: <Activity size={40} />,
            title: 'Sports Physiotherapy',
            description: 'Expert diagnosis and treatment of musculo-skeletal injuries to get you back in the game.',
        },
        {
            icon: <Hand size={40} />,
            title: 'Sports Massage',
            description: 'Deep tissue release to improve circulation, reduce tension, and enhance recovery.',
        },
        {
            icon: <Thermometer size={40} />,
            title: 'Cryotherapy',
            description: 'Advanced cold therapy to reduce inflammation and accelerate muscle healing.',
        },
        {
            icon: <Zap size={40} />,
            title: 'Performance Testing',
            description: 'Data-driven insights into your athletic potential with state-of-the-art equipment.',
        },
        {
            icon: <Heart size={40} />,
            title: 'Post-Op Rehabilitation',
            description: 'Comprehensive care plans to ensure safe and effective recovery after surgery.',
        },
        {
            icon: <UserCheck size={40} />,
            title: 'Preventative Care',
            description: 'Screenings and programs designed to stop injuries before they happen.',
        },
    ];

    return (
        <section id="services" className="py-24 bg-background relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-accent/5 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-accent font-bold tracking-[0.2em] uppercase mb-4 block"
                    >
                        Our Expertise
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-heading font-bold text-heading uppercase italic"
                    >
                        Comprehensive <span className="text-stroke text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">Sports Care</span>
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {services.map((service, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1, duration: 0.5 }}
                            whileHover={{ y: -10, scale: 1.02 }}
                            className="bg-surface/50 backdrop-blur-md border border-white/5 p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-500"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                            <div className="mb-6 text-primary group-hover:text-accent transition-colors duration-300 relative z-10 bg-background/50 w-20 h-20 flex items-center justify-center rounded-full ring-1 ring-white/10 group-hover:ring-primary/50">
                                {service.icon}
                            </div>

                            <h4 className="text-2xl font-heading font-bold text-heading mb-4 uppercase italic relative z-10">{service.title}</h4>
                            <p className="text-gray-400 leading-relaxed relative z-10 group-hover:text-gray-200 transition-colors">{service.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;
