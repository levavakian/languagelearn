import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import './Workspace.css';

const Topbar = () => {
    return (
        <div >
            {/* Topbar content will go here */}
        </div>
    );
};

const Workspace = () => {
    return (
        <div>
            <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
                <Topbar />
                <div className="flex-1 bg-white">
                    {/* Main work area content will go here */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;
