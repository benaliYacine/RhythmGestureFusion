import React from "react";

type CountdownTimerProps = {
    count: number;
};

const CountdownTimer = ({ count }: CountdownTimerProps) => {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/70">
            <div className="text-7xl font-bold animate-countdown">
                {count > 0 ? count : "GO!"}
            </div>
        </div>
    );
};

export default CountdownTimer;
