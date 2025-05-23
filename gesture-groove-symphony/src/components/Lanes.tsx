import React from "react";

type LanesProps = {
    keys: string[];
    targetZonePosition: number;
};

const Lanes = ({ keys, targetZonePosition }: LanesProps) => {
    return (
        <div className="w-full h-full absolute top-0 left-0 flex justify-center">
            {/* Single lane in the center */}
            <div
                className="h-full relative"
                style={{ width: "20%" }} // Fixed width for the single lane
            >
                {/* Lane background */}
                <div className="lane-line h-full w-2 absolute left-1/2 transform -translate-x-1/2 bg-white/10" />

                {/* Enhanced Target Zone - more visible */}
                <div className="absolute top-[62%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    {/* Outer targeting circle */}
                    <div className="absolute w-20 h-20 rounded-full border-4 border-white/50 animate-pulse left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>

                    {/* Middle targeting circle */}
                    <div className="absolute w-18 h-18 rounded-full border-2 border-white/30 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>

                    {/* Inner glow effect */}
                    <div className="absolute w-16 h-16 rounded-full bg-white/10 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>

                    {/* Center point indicator */}
                    <div className="absolute w-4 h-4 rounded-full bg-white/30 left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
            </div>
        </div>
    );
};

export default Lanes;
