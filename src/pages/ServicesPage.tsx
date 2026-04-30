import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Droplet, Zap, Apple, Brain, Bone, Network } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const ServicesPage: React.FC = () => {
    const { hash } = useLocation();

    useEffect(() => {
        if (hash) {
            const id = hash.replace('#', '');
            const element = document.getElementById(id);
            if (element) {
                setTimeout(() => {
                    element.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            }
        } else {
            window.scrollTo(0, 0);
        }
    }, [hash]);

    const servicesDetailed = [
        {
            id: 'physical-therapy',
            icon: <Activity size={60} />,
            title: 'Physical Therapy',
            description: 'Our physical therapy programs are designed to restore mobility, reduce pain, and improve overall physical function. We utilize evidence-based treatments and personalized exercise regimens to help you recover from injuries and prevent future ones.',
            image: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
        {
            id: 'iv-drips',
            icon: <Droplet size={60} />,
            title: 'IV Drips',
            description: 'Replenish your body\'s essential vitamins and minerals directly into your bloodstream. Our customized IV therapies target hydration, immunity boosting, energy enhancement, and rapid athletic recovery.',
            image: 'https://images.unsplash.com/photo-1628102491629-778571d893a3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
        {
            id: 'ems-suits',
            icon: <Zap size={60} />,
            title: 'EMS Suits',
            description: 'Experience the future of fitness with our EMS (Electrical Muscle Stimulation) suits. In just 20 minutes, achieve the results of a 90-minute conventional workout, enhancing muscle strength, endurance, and fat loss safely.',
            image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
        {
            id: 'nutrition',
            icon: <Apple size={60} />,
            title: 'Nutrition',
            description: 'Achieve your wellness goals from the inside out. Our clinical nutritionists provide tailored meal plans, dietary counseling, and ongoing support to optimize your athletic performance and daily energy levels.',
            image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
        {
            id: 'psychiatry',
            icon: <Brain size={60} />,
            title: 'Psychiatry',
            description: 'Mental resilience is key to peak performance. We offer expert psychiatric care and counseling to address sports-related anxiety, performance pressure, and overall mental well-being.',
            image: 'https://images.unsplash.com/photo-1554147090-e1221a04a025?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
        {
            id: 'ortho',
            icon: <Bone size={60} />,
            title: 'Ortho',
            description: 'Comprehensive orthopedic assessments and non-invasive treatments for acute and chronic musculoskeletal conditions. We focus on healing your bones, joints, ligaments, tendons, and muscles.',
            image: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
        {
            id: 'neuro',
            icon: <Network size={60} />,
            title: 'Neuro',
            description: 'Advanced neurological screening and rehabilitation to treat nerve injuries, improve motor control, and enhance mind-muscle connection for superior athletic output.',
            image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
        },
    ];

    return (
        <div className="pt-24 pb-12 bg-background">
            <div className="container mx-auto px-6 text-center mb-16">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-5xl md:text-7xl font-heading font-bold text-white uppercase mt-12 mb-6"
                >
                    Our <span className="text-primary">Services</span>
                </motion.h1>
                <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xl text-gray-400 max-w-2xl mx-auto"
                >
                    Explore our integrated healthcare and performance services tailored to your unique goals.
                </motion.p>
            </div>

            <div className="container mx-auto px-6 space-y-24">
                {servicesDetailed.map((service, index) => {
                    const isEven = index % 2 === 0;
                    return (
                        <section 
                            key={service.id} 
                            id={service.id} 
                            className="scroll-mt-32"
                        >
                            <div className={`flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
                                <motion.div 
                                    initial={{ opacity: 0, x: isEven ? -50 : 50 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    className="flex-1 w-full relative"
                                >
                                    <div className="absolute inset-0 bg-primary/20 transform translate-x-4 translate-y-4 rounded-none z-0"></div>
                                    <img 
                                        src={service.image} 
                                        alt={service.title} 
                                        className="w-full h-[400px] object-cover relative z-10 border border-white/10"
                                    />
                                </motion.div>
                                
                                <motion.div 
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-100px" }}
                                    className="flex-1 space-y-6"
                                >
                                    <div className="text-primary mb-4">
                                        {service.icon}
                                    </div>
                                    <h2 className="text-4xl md:text-5xl font-heading font-bold text-white uppercase">
                                        {service.title}
                                    </h2>
                                    <div className="w-20 h-1 bg-primary"></div>
                                    <p className="text-xl text-gray-300 leading-relaxed font-light">
                                        {service.description}
                                    </p>
                                    <button className="mt-8 px-8 py-3 bg-white/10 hover:bg-primary text-white uppercase tracking-wider font-bold transition-all border border-white/20 hover:border-primary">
                                        Book Consultation
                                    </button>
                                </motion.div>
                            </div>
                        </section>
                    );
                })}
            </div>
        </div>
    );
};

export default ServicesPage;
