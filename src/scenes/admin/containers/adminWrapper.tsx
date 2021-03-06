import {AdminNavigation} from '../../shared/complexTools';
import {AppContainer} from '../../shared';
import {Grid, Icon} from 'semantic-ui-react';
import {IMenu} from '../../t03/defaults/menuItems';
import {useHistory, useParams} from 'react-router-dom';
import DefaultTools from '../components/DefaultTools';
import React from 'react';
import Tools from '../components/Tools';
import User from '../components/User';
import Users from '../components/Users';

export interface IUrlParams {
    property?: string;
    id?: string;
}

const navigation = [{
    name: 'Documentation',
    path: 'https://inowas.com/tools/t02-groundwater-mounding-calculator/',
    icon: <Icon name="file"/>
}];

const menuItems: IMenu = [
    {
        header: '',
        items: [
            {
                name: 'Users',
                property: 'users',
                icon: <Icon name="calendar alternate outline"/>
            },
            {
                name: 'Tools',
                property: 'tools',
                icon: <Icon name="expand"/>
            },
            {
                name: 'Default Tools',
                property: 'defaults',
                icon: <Icon name="expand"/>
            }
        ]
    }
];

const AdminWrapper = () => {

    const urlParams: IUrlParams = useParams();
    const history = useHistory();

    const renderContent = (activeItem?: string) => {
        switch (activeItem) {
            case 'users': {
                if (!urlParams.id) {
                    return <Users/>;
                }

                return <User id={urlParams.id}/>;
            }

            case 'tools': {
                return <Tools/>;
            }

            case 'defaults': {
                return <DefaultTools/>;
            }

            default: {
                history.push('/admin/users');
            }

        }
    };

    return (
        <AppContainer navbarItems={navigation}>
            <Grid padded={true}>
                <Grid.Row>
                    <Grid.Column width={3}>
                        <AdminNavigation
                            navigationItems={menuItems}
                        />
                    </Grid.Column>
                    <Grid.Column width={12}>
                        {renderContent(urlParams.property)}
                    </Grid.Column>
                </Grid.Row>
            </Grid>
        </AppContainer>
    );
};

export default AdminWrapper;
