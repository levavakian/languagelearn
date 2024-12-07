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
                        left: '750px',
                        bottom: '100px',
                        height: '800px',
                        width: 'auto'
                    }}
                />
                <img 
                    src="/rightboy.png"
                    alt=""
                    style={{
                        position: 'absolute',
                        left: '1300px',
                        bottom: '-120px',
                        height: '800px',
                        transform: 'rotate(10deg)',
                        width: 'auto'
                    }}
                />
                <img 
                    src="/toplap.png"
                    alt=""
                    style={{
                        position: 'absolute',
                        bottom: '550px',
                        left: '1550px',
                        transform: 'translateX(-50%)',
                        height: '600px',
                        width: 'auto'
                    }}
                />
            </div>
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh)]">
            <div className="mt-[200px] ml-[120px]">
                <div className="text-[128px] font-ancorli font-regular tracking-tight">
                    ARATTA
                </div>
                <div className="text-[54px] mt-[160px] font-nobel font-semibold">
                    Language learning,
                </div>
                <div className="text-[54px] font-nobel font-semibold text-coral">
                    reimagined<span className="text-indigo-dye">.</span>
                </div>
                <div className="text-[32px] mt-[20px] max-w-[550px] font-nobel font-regular">
                Experience personalized language learning powered by AI. Have natural conversations, get instant feedback, and progress at your own pace.
                </div>
                <div className="mt-[20px] flex items-center gap-2">
                    <div className="text-[20px] font-nobel font-regular mr-2">Sign in to start learning</div>
                    <GoogleLogin
                        onSuccess={handleLoginSuccess}
                        onError={handleLoginFailure}
                        type="standard"
                        text="continue_with"
                        size="large"
                        width="200px"
                        shape="circle"
                    />
                </div>
            </div>
        </div>
    </>;
}