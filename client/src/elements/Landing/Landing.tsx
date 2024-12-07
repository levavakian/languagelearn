import { GoogleLogin } from "@react-oauth/google";
import { toast } from "react-hot-toast";
import { useSetStateValue } from "../../state/state";

export const Landing = () => {
    const setState = useSetStateValue();
    const handleLoginSuccess = (response: any) => {
        const newJwt = response.credential;
        setState(draft => { draft.auth.token = newJwt });
    };

    const handleLoginFailure = () => {
        toast.error('There was an error logging in');
    };
    
    return <>
        <div>
            <div className="bg-baby-powder" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '99%',
                height: '99%',
                zIndex: -1,
                pointerEvents: 'none',
                overflow: 'hidden'
            }}>
                <img 
                    src="/leftgirl.png"
                    alt=""
                    style={{
                        position: 'absolute',
                        left: '46.875rem',
                        bottom: '6.25rem',
                        height: '50rem',
                        width: 'auto'
                    }}
                />
                <img 
                    src="/rightboy.png"
                    alt=""
                    style={{
                        position: 'absolute',
                        left: '81.25rem',
                        bottom: '-7.5rem',
                        height: '50rem',
                        transform: 'rotate(10deg)',
                        width: 'auto'
                    }}
                />
                <img 
                    src="/toplap.png"
                    alt=""
                    style={{
                        position: 'absolute',
                        bottom: '34.375rem',
                        left: '96.875rem',
                        transform: 'translateX(-50%)',
                        height: '37.5rem',
                        width: 'auto'
                    }}
                />
            </div>
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
    </>;
}