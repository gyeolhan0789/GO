package com.wecandoit.common.config;

import com.wecandoit.common.logging.QueryLoggingListener;
import com.wecandoit.common.logging.QueryLoggingProperties;
import javax.sql.DataSource;
import lombok.RequiredArgsConstructor;
import net.ttddyy.dsproxy.support.ProxyDataSource;
import net.ttddyy.dsproxy.support.ProxyDataSourceBuilder;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSourceProxyConfig implements BeanPostProcessor {

    private static final String PROXY_NAME = "wecandoit";

    // BeanPostProcessor가 @ConfigurationProperties를 직접 주입받으면 조기 초기화 경고가 나므로
    // ObjectProvider로 실제 사용 시점에 조회한다.
    private final ObjectProvider<QueryLoggingProperties> queryLoggingProperties;

    @Override
    public Object postProcessAfterInitialization(Object bean, String beanName) {
        if (!(bean instanceof DataSource dataSource) || bean instanceof ProxyDataSource) {
            return bean;
        }
        QueryLoggingProperties properties = queryLoggingProperties.getObject();
        if (!properties.enabled()) {
            return bean;
        }
        return ProxyDataSourceBuilder.create(dataSource)
                .name(PROXY_NAME)
                .listener(new QueryLoggingListener(properties))
                .build();
    }
}
