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
            <div className="workspace-container">
                <Sidebar />
                <div className="workspace-main">
                    <Topbar />
                    <div className="workspace-content">
                        {/* Main work area content will go here */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Workspace;
