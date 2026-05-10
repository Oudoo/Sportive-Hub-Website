import React from 'react';
import { Activity, Droplet, Zap, Apple, Brain, Bone, Network } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const Services: React.FC = () => {
    const services = [
        {
            id: 'physical-therapy',
            icon: <Activity size={24} />,
            image: '/services/Physical-therapy-3.jpg',
            title: 'Physical Therapy',
            description: 'Expert diagnosis and treatment of musculo-skeletal injuries to get you back in the game.',
        },
        {
            id: 'iv-drips',
            icon: <Droplet size={24} />,
            image: '/services/Iv-drips--2.jpg',
            title: 'IV Drips',
            description: 'Direct hydration and nutrient delivery to accelerate recovery and boost immune health.',
        },
        {
            id: 'ems-suits',
            icon: <Zap size={24} />,
            image: '/services/Ems-suits--5.jpg',
            title: 'EMS Suits',
            description: 'Electrical muscle stimulation for highly efficient workouts and targeted rehabilitation.',
        },
        {
            id: 'nutrition',
            icon: <Apple size={24} />,
            image: '/services/nutrition.png',
            title: 'Nutrition',
            description: 'Personalized dietary plans designed to optimize performance and health.',
        },
        {
            id: 'psychiatry',
            icon: <Brain size={24} />,
            image: '/services/psychiatry.png',
            title: 'Psychiatry',
            description: 'Mental health support tailored for optimal well-being and stress management.',
        },
        {
            id: 'ortho',
            icon: <Bone size={24} />,
            image: '/services/ortho.png',
            title: 'Ortho',
            description: 'Specialized orthopedic care addressing bone and joint conditions.',
        },
        {
            id: 'neuro',
            icon: <Network size={24} />,
            image: '/services/Neuro-2.jpg',
            title: 'Neuro',
            description: 'Neurological assessments and treatments for nerve-related issues and recovery.',
        },
    ];


    return (
        <section id="services" className="py-24 bg-background relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-accent/50 blur-[100px] rounded-full pointer-events-none"></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-primary font-bold tracking-[0.2em] uppercase mb-4 block"
                    >
                        Our Expertise
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-5xl font-heading font-bold text-heading uppercase"
                    >
                        Comprehensive <span className="text-primary">Sports Care</span>
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
                                whileHover={{ y: -10 }}
                                className="bg-surface/50 backdrop-blur-md border border-primary/10 relative overflow-hidden group hover:border-primary/50 transition-all duration-500 h-full flex flex-col rounded-xl"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                                {/* Vertical Image Container (3:4 aspect ratio) */}
                                <div className="w-full aspect-[3/4] overflow-hidden relative bg-background/50 flex-shrink-0">
                                    {service.image ? (
                                        <>
                                            <img 
                                                src={service.image} 
                                                alt={service.title} 
                                                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                                                loading="lazy"
                                            />
                                            {/* Gradient overlay for smooth transition to content */}
                                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-surface to-transparent opacity-90 pointer-events-none"></div>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <div className="text-primary opacity-20 group-hover:opacity-50 transition-opacity duration-500 scale-[3]">
                                                {service.icon}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Floating Icon Badge */}
                                    <div className="absolute bottom-4 left-6 z-10 bg-background/80 backdrop-blur-md w-12 h-12 flex items-center justify-center rounded-full ring-1 ring-primary/20 text-primary shadow-lg group-hover:ring-primary/50 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                        {service.icon}
                                    </div>
                                </div>

                                <div className="p-6 relative z-10 flex flex-col flex-1 bg-surface">
                                    <h4 className="text-2xl font-heading font-bold text-heading mb-3 uppercase italic">{service.title}</h4>
                                    <p className="text-text leading-relaxed group-hover:text-primary transition-colors flex-1">{service.description}</p>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Services;

