import React from "react";
import { Slider } from "@/components/ui/slider";
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";

type VolumeControlsProps = {
    masterVolume: number;
    musicVolume: number;
    sfxVolume: number;
    onMasterVolumeChange: (value: number) => void;
    onMusicVolumeChange: (value: number) => void;
    onSfxVolumeChange: (value: number) => void;
    className?: string;
};

const VolumeControls = ({
    masterVolume,
    musicVolume,
    sfxVolume,
    onMasterVolumeChange,
    onMusicVolumeChange,
    onSfxVolumeChange,
    className = "",
}: VolumeControlsProps) => {
    // Get appropriate volume icon based on volume level
    const getVolumeIcon = (volume: number) => {
        if (volume === 0) return <VolumeX size={18} />;
        if (volume < 0.33) return <Volume size={18} />;
        if (volume < 0.66) return <Volume1 size={18} />;
        return <Volume2 size={18} />;
    };

    return (
        <div className={`p-3 rounded-lg bg-black/80 ${className}`}>
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    {getVolumeIcon(masterVolume)}
                    <span className="text-xs font-medium w-16">Master</span>
                    <Slider
                        value={[masterVolume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) =>
                            onMasterVolumeChange(value[0] / 100)
                        }
                        className="w-32"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {getVolumeIcon(musicVolume)}
                    <span className="text-xs font-medium w-16">Music</span>
                    <Slider
                        value={[musicVolume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) =>
                            onMusicVolumeChange(value[0] / 100)
                        }
                        className="w-32"
                    />
                </div>

                <div className="flex items-center gap-2">
                    {getVolumeIcon(sfxVolume)}
                    <span className="text-xs font-medium w-16">SFX</span>
                    <Slider
                        value={[sfxVolume * 100]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(value) =>
                            onSfxVolumeChange(value[0] / 100)
                        }
                        className="w-32"
                    />
                </div>
            </div>
        </div>
    );
};

export default VolumeControls;
