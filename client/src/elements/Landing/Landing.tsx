import { GoogleLogin } from "@react-oauth/google";
import { toast } from "react-hot-toast";
import { useSetStateValue } from "../../state/state";
import { useWindowSize } from "../../utils/globals";

export const Landing = () => {
    const setState = useSetStateValue();
    const handleLoginSuccess = (response: any) => {
        const newJwt = response.credential;
        setState(draft => { draft.auth.token = newJwt });
    };

    const handleLoginFailure = () => {
        toast.error('There was an error logging in');
    };

    useWindowSize();
    
    if (window.innerWidth < 1500) {
        return (
            <div className="bg-baby-powder h-screen w-screen flex flex-col">
                <div className="absolute w-[100%] h-[100%] bg-baby-powder z-[-1]"></div>
                <div className="pt-[10%] mb-[0em] text-[500%] items-center justify-center flex font-ancorli font-regular tracking-tight">
                    ARATTA
                </div>
                <div className="pl-[5%] flex-1 flex flex-col">
                    <div className="text-[250%] mt-[15%] font-nobel font-semibold">
                        Language learning,
                    </div>
                    <div className="text-[250%] font-nobel font-semibold text-coral">
                        reimagined<span className="text-indigo-dye">.</span>
                    </div>
                    <div className="text-[175%] mt-[1.25rem] max-w-[34.375rem] font-nobel font-regular">
                        Experience personalized language learning powered by AI. Have natural conversations, get instant feedback, and progress at your own pace.
                    </div>
                    <div className="mt-auto mb-[2rem] mr-[1rem] ml-auto flex flex-col items-rights justify-right gap-2">
                        <div className="text-[1.25rem] font-nobel font-regular">Sign in to start learning</div>
                        <GoogleLogin
                            onSuccess={handleLoginSuccess}
                            onError={handleLoginFailure}
                            type="standard"
                            text="continue_with"
                            size="large"
                            width="12.5rem"
                            shape="circle"
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="absolute w-[100%] h-[100%] bg-baby-powder z-[-1]"></div>
            <div className="w-full h-full bg-baby-powder">
                {/* SVG "portal" background */}
                <svg
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: -1,
                        pointerEvents: 'none',
                    }}
                    viewBox="0 0 2000 1200"
                    preserveAspectRatio="xMidYMid slice"
                >
                    {/* leftgirl.svg 
                       Originally: left:600px; bottom:0px; height:800px
                       If we treat the bottom at y=1200, placing bottom:0 means the top of the image is at y=1200-800=400.
                       x=600, y=400. We guess width=500, height=800 for scaling. */}
                    <image
                        href="/leftgirl.svg"
                        x="800"
                        y="200"
                        width="500"
                        height="800"
                    />

                    {/* rightguy.svg
                       Originally: left:1100px; bottom:-275px; height:850px; rotate(10deg)
                       bottom:-275 means the image extends 275px below the bottom line (y=1200).
                       The bottom of image = 1200 + 275 = 1475. top = 1475 - 850 = 625.
                       So x=1100, y=625.
                       We'll rotate around its center.
                       If width=600, height=850, center = (1100+300, 625+425) = (1400,1050).
                    */}
                    <image
                        href="/rightguy.svg"
                        x="1200"
                        y="325"
                        width="600"
                        height="850"
                        transform="rotate(10,1400,1050)"
                    />

                    {/* toplap.svg
                       Originally: bottom:300px; left:1150px; translateX(-50%); height:650px
                       bottom:300 means bottom edge at y=1200-300=900. top=900-650=250.
                       left:1150px with translateX(-50%) shifts the image left by half its width.
                       If width=600, half is 300. So final x=1150-300=850.
                       So x=850, y=250.
                    */}
                    <image
                        href="/toplap.svg"
                        x="1050"
                        y="50"
                        width="600"
                        height="650"
                    />
                </svg>
            </div>

            <div className="overflow-y-auto max-h-[calc(100vh)]">
                <div className="mt-[10vh] ml-[7.5rem] mb-[10vh]">
                    <div className="text-[8rem] font-ancorli font-regular tracking-tight">
                        ARATTA
                    </div>
                    <div className="text-[3.375rem] mt-[10rem] font-nobel font-semibold">
                        Language learning,
                    </div>
                    <div className="text-[3.375rem] font-nobel font-semibold text-coral">
                        reimagined<span className="text-indigo-dye">.</span>
                    </div>
                    <div className="text-[2rem] mt-[1.25rem] max-w-[34.375rem] font-nobel font-regular">
                        Experience personalized language learning powered by AI. Have natural conversations, get instant feedback, and progress at your own pace.
                    </div>
                    <div className="mt-[1.25rem] flex items-center gap-2">
                        <div className="text-[1.25rem] font-nobel font-regular mr-2">Sign in to start learning</div>
                        <GoogleLogin
                            onSuccess={handleLoginSuccess}
                            onError={handleLoginFailure}
                            type="standard"
                            text="continue_with"
                            size="large"
                            width="12.5rem"
                            shape="circle"
                        />
                    </div>
                </div>
            </div>
        </>
    );
};
