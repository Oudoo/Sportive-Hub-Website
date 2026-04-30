import React from 'react';
import Hero from '../components/Hero';
import Services from '../components/Services';
import Locations from '../components/Locations';
import About from '../components/About';

const Home: React.FC = () => {
    return (
        <main>
            <Hero />
            <Services />
            <Locations />
            <About />
        </main>
    );
};

export default Home;
