import React from 'react';
import { Activity, Droplet, Zap, Apple, Brain, Bone, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Services: React.FC = () => {
    const services = [
        {
            id: 'physical-therapy',
            icon: <Activity size={40} />,
            title: 'Physical Therapy',
            description: 'Expert diagnosis and treatment of musculo-skeletal injuries to get you back in the game.',
        },
        {
            id: 'iv-drips',
            icon: <Droplet size={40} />,
            title: 'IV Drips',
            description: 'Direct hydration and nutrient delivery to accelerate recovery and boost immune health.',
        },
        {
            id: 'ems-suits',
            icon: <Zap size={40} />,
            title: 'EMS Suits',
            description: 'Electrical muscle stimulation for highly efficient workouts and targeted rehabilitation.',
        },
        {
            id: 'nutrition',
            icon: <Apple size={40} />,
            title: 'Nutrition',
            description: 'Personalized dietary plans designed to optimize performance and health.',
        },
        {
            id: 'psychiatry',
            icon: <Brain size={40} />,
            title: 'Psychiatry',
            description: 'Mental health support tailored for optimal well-being and stress management.',
        },
        {
            id: 'ortho',
            icon: <Bone size={40} />,
            title: 'Ortho',
            description: 'Specialized orthopedic care addressing bone and joint conditions.',
        },
        {
            id: 'neuro',
            icon: <Network size={40} />,
            title: 'Neuro',
            description: 'Neurological assessments and treatments for nerve-related issues and recovery.',
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {services.map((service, index) => (
                        <Link to={`/services#${service.id}`} key={service.id}>
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                whileHover={{ y: -10, scale: 1.02 }}
                                className="bg-surface/50 backdrop-blur-md border border-white/5 p-8 relative overflow-hidden group hover:border-primary/50 transition-colors duration-500 h-full flex flex-col"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className="mb-6 text-primary group-hover:text-accent transition-colors duration-300 relative z-10 bg-background/50 w-20 h-20 flex items-center justify-center rounded-full ring-1 ring-white/10 group-hover:ring-primary/50 shrink-0">
                                    {service.icon}
                                </div>

                                <h4 className="text-2xl font-heading font-bold text-heading mb-4 uppercase italic relative z-10">{service.title}</h4>
                                <p className="text-gray-400 leading-relaxed relative z-10 group-hover:text-gray-200 transition-colors flex-1">{service.description}</p>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;
