import React from 'react';

const Footer = ({ t }) => {
    if (!t || !t.footer) return null;

    return (
        <footer className="relative bg-white/70 backdrop-blur-xl border-t border-indigo-50/50 py-16 px-6 mt-auto overflow-hidden">
            {/* Subtle background glow for harmony */}
            <div className="absolute top-0 left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-indigo-50/30 to-transparent blur-3xl -z-10 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto flex flex-col space-y-12 relative z-10">
                {/* Brand Logo */}
                <div className="flex items-center -ml-2">
                    <img 
                        src="/assets/aidm-logo-ultra.png" 
                        alt="AIDM Logo" 
                        className="h-16 w-auto object-contain"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>

                {/* Info Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 items-start">
                    {/* Left: Biz Info */}
                    <div className="flex flex-col space-y-3 text-[13px] leading-relaxed">
                        {t.footer.biz.map((item, idx) => (
                            <div key={idx} className="flex flex-wrap gap-x-1.5">
                                <span className="text-gray-400 font-bold tracking-tight whitespace-nowrap">{item.label}:</span>
                                <span className="text-gray-600 font-medium">{item.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Right: Contact Info */}
                    <div className="flex flex-col space-y-3 text-[13px] leading-relaxed md:pl-10 lg:pl-20">
                        {t.footer.contact.map((item, idx) => (
                            <div key={idx} className="flex flex-wrap gap-x-1.5">
                                <span className="text-gray-400 font-bold tracking-tight whitespace-nowrap uppercase">{item.label}:</span>
                                <span className={item.label === 'E-mail' ? 'text-indigo-600 font-bold hover:text-indigo-700 transition-colors cursor-pointer' : 'text-gray-600 font-medium'}>
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-gray-100 flex justify-center relative z-10">
                <p className="text-[11px] font-bold text-gray-400 tracking-wider text-center">
                    {t.footer.rights}
                </p>
            </div>
        </footer>
    );
};

export default Footer;
