import React from 'react';
import Sidebar from '../Sidebar/Sidebar';
import { Topbar } from '../Topbar/Topbar';
import './Workspace.css';

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
